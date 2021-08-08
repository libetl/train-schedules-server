import { URL } from "url";
import { ClientRequest, IncomingMessage } from "http";
import { RequestOptions, request as httpsRequest } from "https";
import { request as httpRequest } from "http";

export const fetch = async (
  url: string,
  {
    headers,
    responseType,
  }: { headers?: Record<string, string>; responseType?: "arraybuffer" }
): Promise<{ data: any }> => {
  const urlObject = new URL(url);
  const options: RequestOptions = {
    hostname: urlObject.hostname,
    path: urlObject.pathname,
    port: urlObject.port,
    protocol: urlObject.protocol,
    rejectUnauthorized: false,
    method: "GET",
    headers: {
      ...Object.assign(
        {},
        ...Object.entries(headers || {})
          .filter(
            ([h]) =>
              !h.startsWith(":") && h.toLowerCase() !== "transfer-encoding"
          )
          .map(([key, value]) => ({ [key]: value }))
      ),
      host: urlObject.hostname,
    },
  };
  const outboundResponse: IncomingMessage = await new Promise((resolve) => {
    const outboundRequest: ClientRequest =
      urlObject.protocol === 'http:' ?
        httpRequest(options, resolve) :
        httpsRequest(options, resolve);
    outboundRequest.end();
  });
  const data = await new Promise((resolve) => {
    let partialBody = Buffer.alloc(0);
    if (!outboundResponse) {
      resolve(partialBody);
      return;
    }
    (outboundResponse as any).on(
      "data",
      (chunk: Buffer | string) =>
      (partialBody = Buffer.concat([
        partialBody,
        typeof chunk === "string"
          ? Buffer.from(chunk as string)
          : (chunk as Buffer),
      ]))
    );
    (outboundResponse as any).on("end", () => {
      resolve(partialBody);
    });
  });
  if (responseType === "arraybuffer") return { data };
  return { data: data.toString() };
};
