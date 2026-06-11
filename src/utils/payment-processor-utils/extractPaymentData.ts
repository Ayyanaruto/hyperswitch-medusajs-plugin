import { MedusaError } from "@medusajs/framework/utils";

export function extractPaymentData<T extends Record<string, any>>(
    paymentData: { data?: Record<string, unknown> },
    requiredFields: string[] = []
): T {
    let data: T;
    
    if (paymentData.data) {
        const dataObj = paymentData.data as Record<string, unknown>;
        
        if (dataObj.data && typeof dataObj.data === 'object') {
            // Handle nested data structure: paymentData.data.data
            data = dataObj.data as T;
        } else {
            // Handle flat structure: paymentData.data
            data = dataObj as T;
        }
    } else {
        throw new MedusaError(
            MedusaError.Types.INVALID_DATA,
            "Payment data is missing or invalid",
            "400"
        );
    }
    
    // Validate required fields
    for (const field of requiredFields) {
        console.log(`Checking required field: ${field}`);
        if (!data[field]) {
            throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                `${field} is required for this operation`,
                "400"
            );
        }
    }

    return data;
}
