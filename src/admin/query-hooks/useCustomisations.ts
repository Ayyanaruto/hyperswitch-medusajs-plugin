import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@medusajs/ui";

export const useCustomisation = () => {
  const fetchCustomisation = async () => {
    const response = await fetch("/admin/hyperswitch/customisation");
    if (!response.ok) {
      throw new Error("Failed to fetch customisation");
    }
    return response.json();
  };

  const { data, isLoading, isError } = useQuery({
    queryKey: ["customisation"],
    queryFn: fetchCustomisation,
  });


  useEffect(() => {
    if (isError) {
      toast.error("Error", {
        description: "Failed to fetch settings",
      });
    }
  }, [isError]);

  return { data, isLoading };
};
