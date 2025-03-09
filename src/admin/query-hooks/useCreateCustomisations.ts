import { useMutation, useQueryClient } from "@tanstack/react-query";

const createCustomisation = async (data: any) => {
  const response = await fetch("/admin/hyperswitch/customisation", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create customisation");
  }

  return response.json();
};

export const useCreateCustomisation = () => {
  const queryClient = useQueryClient();

  const { mutate, data, isLoading, isSuccess, isError } = useMutation({
    mutationFn: createCustomisation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customisation"] });
    },
  });

  return { mutate, data, isLoading, isSuccess, isError };
};
