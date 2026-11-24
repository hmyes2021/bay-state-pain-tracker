import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/** Opens an "add" dialog when the URL has ?new=1 (deep links from Home), then cleans the URL. */
export function useNewParam(open: () => void) {
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (params.get("new") === "1") {
      open();
      params.delete("new");
      setParams(params, { replace: true });
    }
  }, [params, setParams, open]);
}
