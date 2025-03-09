import { useMutation } from "@tanstack/react-query";

export const useCreateProxyConfiguration = () => {
  const createProxyConfig = async (data: any) => {
    const response = await fetch("/admin/hyperswitch/proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to create proxy configuration");
    }

    return await response.json();
  };

  const {
    mutate,
    data,
    isLoading,
    isSuccess,
    isError
  } = useMutation({
    mutationFn: createProxyConfig,
  });

  return { mutate, data, isLoading, isSuccess, isError };
};
