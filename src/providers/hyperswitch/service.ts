import {
  AbstractPaymentProvider,
  BigNumber,
  MedusaError,
  PaymentActions,
  PaymentSessionStatus as PaymentSession,
} from "@medusajs/framework/utils";
import { MedusaContainer } from "@medusajs/framework";
import HyperSwitch from "../../libs/hyperswitch";
import { configWorkflow, customWorkflow, proxyWorkflow } from "../../workflows";
import {
  Logger,
  toHyperSwitchAmount,
  canCancelPayment,
  formatPaymentData,
  mapProcessorStatusToPaymentStatus,
  filterNull,
  fromHyperSwitchAmount,
  validateWebhook,
  extractPaymentData
} from "../../utils";
import {
  ProviderWebhookPayload,
  WebhookActionResult,
  CapturePaymentInput,
  CapturePaymentOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
} from "@medusajs/framework/types";
class HyperswitchPaymentProvider extends AbstractPaymentProvider {
  static identifier: string = "hyperswitch";

  private hyperswitch!: HyperSwitch;
  private captureMethod!: "manual" | "automatic";
  private setupFutureUsage!: boolean;
  private paymentResponseHashKey!: string;
  private profileId!: string;
  private theme!: string;
  private styles!: Record<string, unknown>;
  protected logger: Logger;
  private initialized = false;

  constructor(container: MedusaContainer) {
    super(container);
    this.logger = new Logger();
  }

  /**
   * Initializes the Hyperswitch client with configuration and proxy settings.
   * This method is called before any payment operations are performed.
   * It fetches the configuration and proxy settings using the respective workflows.
   */
  private async initializeHyperswitch(): Promise<void> {

    try {
      const { result: configResult } = await configWorkflow().run();
      const { result: proxyResult } = await proxyWorkflow().run();
      const { result: customResult } = await customWorkflow().run();

      this.hyperswitch = new HyperSwitch(
        configResult.secretKey,
        configResult.environment,
        proxyResult
      );
      this.captureMethod = configResult.captureMethod;
      this.setupFutureUsage = configResult.enableSaveCards;
      this.profileId = configResult.profileId;
      this.paymentResponseHashKey = configResult.paymentHashKey;
      this.theme = customResult.theme;
      this.styles = customResult.styles;

      this.logger.info("Hyperswitch initialized successfully", 
        { environment: configResult.environment },
        "HYPERSWITCH_INIT_SUCCESS"
      );
    } catch (error) {
      this.logger.error(
        "Error in initializing Hyperswitch",
        error,
        "HYPERSWITCH_INIT_ERROR"
      );
      throw new MedusaError(
        MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
        "Failed to initialize payment provider",
        "500"
      );
    }
  }

  /**
   * Common error handler for payment operations
   */
  private handleError(message: string, error: unknown, code: string): never {
    this.logger.error(message, error, code);
    throw new MedusaError(
      MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
      message,
      "500"
    );
  }

  /**
   * Formats response data consistently
   */
  private formatResponseData(
    responseData: any,
    additionalData: Record<string, unknown> = {}
  ): Record<string, unknown> {
    return {
      client_secret: responseData.client_secret,
      amount: responseData.amount,
      currency: responseData.currency,
      status: responseData.status,
      payment_id: responseData.payment_id,
      theme: this.theme,
      styles: this.styles,
      metadata: responseData.metadata,
      ...additionalData
    };
  }
  async initiatePayment(
    context: InitiatePaymentInput
  ): Promise<InitiatePaymentOutput> {
    try {
      await this.initializeHyperswitch();
      
      if (!context.data) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Payment context data is required",
          "400"
        );
      }

      const formattedData = formatPaymentData(
        context as any,
        this.setupFutureUsage,
        this.captureMethod,
        this.profileId,
        toHyperSwitchAmount
      );
      
      const response = await this.hyperswitch.transactions.create(formattedData);
      
      return {
        id: response.data.payment_id,
        data: this.formatResponseData(response.data),
      };
    } catch (error) {
      return this.handleError(
        "Error in initiating payment",
        error,
        "HYPERSWITCH_INITIATE_PAYMENT_ERROR"
      );
    }
  }

  async updatePayment(
    input: UpdatePaymentInput
  ): Promise<UpdatePaymentOutput> {
    try {
      await this.initializeHyperswitch();
      
      const formattedData = formatPaymentData(
        input as any,
        this.setupFutureUsage,
        this.captureMethod,
        this.profileId,
        toHyperSwitchAmount
      );
      
      const response = await this.hyperswitch.transactions.update(
        formattedData as any
      );
      
      return {
        data: this.formatResponseData(response.data),
      };
    } catch (error) {
      return this.handleError(
        "Error in updating payment",
        error,
        "HYPERSWITCH_UPDATE_PAYMENT_ERROR"
      );
    }
  }

  async deletePayment(
    input: DeletePaymentInput
  ): Promise<DeletePaymentOutput> {
    try {
      const { payment_id } = extractPaymentData(input, ['payment_id']);
      
      if (!payment_id) {
        return {
          data: {},
        };
      }
      
      await this.initializeHyperswitch();
      const currentStatus = await this.hyperswitch.transactions.fetch({
        payment_id: payment_id as string,
      });

      if (!canCancelPayment(currentStatus.data)) {
        this.logger.error(
          "Payment cannot be deleted",
          { status: currentStatus.data.status },
          "HYPERSWITCH_DELETE_PAYMENT_ERROR"
        );
        throw new MedusaError(
          MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
          "Payment cannot be canceled in its current state",
          "400"
        );
      }

      await this.hyperswitch.transactions.cancel({
        payment_id: payment_id as string,
        cancellation_reason: "requested_by_customer",
      });

      return {
        data: {},
      };
    } catch (error) {
      return this.handleError(
        "Error in deleting payment",
        error,
        "HYPERSWITCH_DELETE_PAYMENT_ERROR"
      );
    }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    try {
      await this.initializeHyperswitch();
      
      const { payment_id } = extractPaymentData(input, ['payment_id']);
      
      if (!payment_id) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Payment ID is required to authorize payment",
        "400"
      );
      }
      
      const { status } = await this.getPaymentStatus(input);
      
      this.logger.info(
      "Payment authorization status checked",
      { payment_id, status },
      "HYPERSWITCH_AUTHORIZE_STATUS"
      );
      
      return {
      status,
      data: {
        ...filterNull(input.data ?? {}),
        status,
      },
      };
    } catch (error) {
      return this.handleError(
        "Error in authorizing payment",
        error,
        "HYPERSWITCH_AUTHORIZE_PAYMENT_ERROR"
      );
    }
  }

  async capturePayment(
    paymentData: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    try {
      const { payment_id, amount } = extractPaymentData(paymentData, ['amount', 'payment_id']);
      
      await this.initializeHyperswitch();
      const { status: currentStatus } = await this.getPaymentStatus(paymentData);

      // Only capture if not already captured
      if (currentStatus !== PaymentSession.CAPTURED) {
        const { data: responseData } = await this.hyperswitch.transactions.capture({
          payment_id: payment_id as string,
          amount_to_capture: amount as number,
        });

        this.logger.info(
          "Payment captured successfully",
          { payment_id, amount },
          "HYPERSWITCH_CAPTURE_SUCCESS"
        );

        return {
          data: filterNull(responseData),
        };
      }

      return {
        data: paymentData,
      };
    } catch (error) {
      return this.handleError(
        "Error in capturing payment",
        error,
        "HYPERSWITCH_CAPTURE_PAYMENT_ERROR"
      );
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    try {
      const { data } = await this.deletePayment(input);
      return { data };
    } catch (error) {
      return this.handleError(
        "Error in canceling payment",
        error,
        "HYPERSWITCH_CANCEL_PAYMENT_ERROR"
      );
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    try {
      const { payment_id } = extractPaymentData(input, ['payment_id']);
      
      if (!payment_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Payment ID is required to retrieve payment",
          "400"
        );
      }
      
      await this.initializeHyperswitch();
      const { data } = await this.hyperswitch.transactions.fetch({
        payment_id: payment_id as string,
      });
      
      return {
        data: {
          ...(input.data ?? {}),
          ...data,
        },
      };
    } catch (error) {
      return this.handleError(
        "Error in retrieving payment",
        error,
        "HYPERSWITCH_RETRIEVE_PAYMENT_ERROR"
      );
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    try {
      const { payment_id, amount, currency, metadata } = extractPaymentData(
        input,
        ['payment_id', 'amount', 'currency', 'metadata']
      );
      
      let refAmount: number;
      const refundAmount = input.amount ? Number(input.amount) : undefined;
      
      if (!refundAmount) {
        // If no refund amount is provided, use the full amount
        refAmount = amount as number;
      } else {
        // Only convert refundAmount if it's explicitly provided
        refAmount = toHyperSwitchAmount({
          amount: refundAmount,
          currency: currency as string,
        });
        
        if (refundAmount > (amount as number)) {
          throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Refund amount cannot be greater than the payment amount",
            "400"
          );
        }
      }
      
      await this.initializeHyperswitch();
      const { data: api_data } = await this.hyperswitch.transactions.refund({
        payment_id: payment_id as string,
        reason: "requested_by_customer",
        amount: refAmount,
        metadata: {
          session_id: metadata && (metadata as Record<string, unknown>).session_id
        }
      });
      
      this.logger.info(
        "Payment refunded successfully",
        { payment_id, refundAmount: refundAmount || amount },
        "HYPERSWITCH_REFUND_SUCCESS"
      );
      
      return {
        data: {
          ...(input.data ?? {}),
          ...api_data,
        },
      };
    } catch (error) {
      this.logger.error(
        "Error in refunding payment",
        error,
        "HYPERSWITCH_REFUND_PAYMENT_ERROR"
      );
      throw new MedusaError(
        MedusaError.Types.PAYMENT_REQUIRES_MORE_ERROR,
        "Failed to process refund",
        "500"
      );
    }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    try {
      const { payment_id } = extractPaymentData(input, ['payment_id']);

      if (!payment_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Payment ID is required to get payment status",
          "400"
        );
      }

      await this.initializeHyperswitch();
      const { data: paymentData } = await this.hyperswitch.transactions.fetch({
        payment_id: payment_id as string,
      });
      
      return {
        status: mapProcessorStatusToPaymentStatus(paymentData.status as any),
      };
    } catch (error) {
      return this.handleError(
        "Error in getting payment status",
        error,
        "HYPERSWITCH_GET_PAYMENT_STATUS_ERROR"
      );
    }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    // Delay the webhook processing for better reliability
    await new Promise((resolve) => setTimeout(resolve, 5000));
    
    const { data, rawData, headers } = payload;
    if (!validateWebhook(this.paymentResponseHashKey, rawData, headers)) {
      this.logger.error(
        "Invalid webhook signature",
        { headers },
        "HYPERSWITCH_WEBHOOK_ERROR"
      );
      return {
        action: PaymentActions.FAILED,
      };
    }
    
    try {
      const { event_type, content } = data;
      const { metadata, amount, currency } = (
        content as {
          object: { metadata: any; amount: number; currency: string };
        }
      ).object;
      const session_id = metadata?.session_id;
      if (!session_id) {
        this.logger.warn(
          "Missing session ID in webhook",
          { event_type },
          "HYPERSWITCH_WEBHOOK_WARNING"
        );
      }
      
      const amountBigNumber = new BigNumber(
        fromHyperSwitchAmount({ amount, currency })
      );

      this.logger.info(
        `Processing webhook: ${event_type}`,
        { session_id, amount: amountBigNumber.toString() },
        "HYPERSWITCH_WEBHOOK"
      );

      switch (event_type) {
        case "payment_authorized":
          return {
            action: PaymentActions.AUTHORIZED,
            data: { session_id, amount: amountBigNumber },
          };
        case "payment_succeeded":
          return {
            action: PaymentActions.SUCCESSFUL,
            data: { session_id, amount: amountBigNumber },
          };
        case "payment_failed":
          return {
            action: PaymentActions.FAILED,
            data: { session_id, amount: amountBigNumber },
          };
        case "refund_succeeded":
          return {
            action: PaymentActions.SUCCESSFUL,
            data: { session_id, amount: new BigNumber(0) },
          };
        case "refund_failed":
          return {
            action: PaymentActions.SUCCESSFUL,
            data: { session_id, amount: amountBigNumber },
          };
        default:
          this.logger.warn(
            "Unsupported webhook event",
            { event_type },
            "HYPERSWITCH_WEBHOOK_WARNING"
          );
          return { action: PaymentActions.NOT_SUPPORTED };
      }
    } catch (error) {
      this.logger.error(
        "Error processing webhook",
        error,
        "HYPERSWITCH_WEBHOOK_ERROR"
      );
      
      // Best-effort to extract session_id even in error case
      try {
        const session_id = (
          data.content as { object: { metadata: { session_id: string } } }
        ).object.metadata.session_id;
        
        const webhookAmount = new BigNumber(
          (data.content as { object: { amount: number } }).object.amount
        );
        
        return {
          action: PaymentActions.FAILED,
          data: { session_id, amount: webhookAmount },
        };
      } catch {
        return { action: PaymentActions.FAILED };
      }
    }
  }
}

export default HyperswitchPaymentProvider;
