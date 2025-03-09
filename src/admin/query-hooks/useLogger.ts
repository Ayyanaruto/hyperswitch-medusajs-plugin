import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@medusajs/ui";

export const useLogger = () => {
  const fetchLogs = async () => {
    const response = await fetch("/admin/hyperswitch/logger", {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch logs");
    }

    return response.json();
  };

  const { data, isSuccess, isLoading, isError } = useQuery({
    queryKey: ["logs"],
    queryFn: fetchLogs,
  });

  useEffect(() => {
    if (isError) {
      toast.error("Error", {
        description: "Failed to fetch logs",
      });
    }
  }, [isError]);

  return { data, isSuccess, isLoading };
};
