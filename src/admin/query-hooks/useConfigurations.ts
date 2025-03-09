import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@medusajs/ui";

export const useConfigurations = () => {
  const { data, isSuccess, isLoading, isError } = useQuery({
    queryKey: ["configurations"],
    queryFn: async () => {
      const response = await fetch("/admin/hyperswitch/configuration");
      if (!response.ok) {
        throw new Error("Failed to fetch configurations");
      }
      return response.json();
    }
  });

  useEffect(() => {
    if (isError) {
      toast.error("Error", {
        description: "Failed to fetch settings",
      });
    }
  }, [isError]);

  return { data, isSuccess, isLoading };
};
