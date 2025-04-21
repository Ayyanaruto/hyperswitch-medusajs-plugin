import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@medusajs/ui";

export const useProxyConfiguration = () => {
  const fetchProxyConfiguration = async () => {
    const response = await fetch("/admin/hyperswitch/proxy");
    if (!response.ok) {
      throw new Error("Failed to fetch proxy configuration");
    }
    return await response.json();
  };

  const { data, isSuccess, isLoading, isError } = useQuery({
    queryKey: ["proxy"],
    queryFn: fetchProxyConfiguration,
  });
  
  
  useEffect(() => {
    if (isError) {
      toast.error("Error", {
        description: "Failed to fetch proxy configuration",
      });
    }
  }, [isError]);

  return { data, isSuccess, isLoading };
};
