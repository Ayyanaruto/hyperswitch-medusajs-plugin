import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCreateConfigurations = () => {
  const queryClient = useQueryClient();
  
  const createConfiguration = async (data: any) => {
    const response = await fetch("/admin/hyperswitch/configuration", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error("Failed to create configuration");
    }
    
    return response.json();
  };

  const { mutate, data, isLoading, isSuccess, isError } = useMutation({
    mutationFn: createConfiguration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configurations"] });
    },
  });

  return { mutate, data, isLoading, isSuccess, isError };
};
