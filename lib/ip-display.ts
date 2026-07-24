const isIpv4Octet = (value: string) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 255;
};

const maskIpv4 = (value: string) => {
  const match = value.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match || !match.slice(1).every(isIpv4Octet)) return null;
  return `${match[1]}.${match[2]}.***.***`;
};

export const displayIpPrefix = (ip: string) => {
  const normalized = ip.trim().toLowerCase();
  const ipv4 = maskIpv4(normalized);
  if (ipv4) return ipv4;

  const mappedIpv4 = normalized.match(/^(?:::ffff:|0:0:0:0:0:ffff:)(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) return maskIpv4(mappedIpv4[1]) || "비공개";

  const ipv6 = normalized.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})(?::|$)/);
  if (ipv6) return `${ipv6[1]}:${ipv6[2]}:****:****`;

  return "비공개";
};

export const formatPublicIpLabel = (value: string | null | undefined) => {
  if (!value || value === "비공개") return "IP 비공개";
  return value.includes(":") ? `IPv6 ${value}` : `IP ${value}`;
};

export const normalizeStoredIpPrefix = (value: string | null | undefined) => {
  if (!value) return null;
  if (/^\d{1,3}\.\d{1,3}\.\*\*\*\.\*\*\*$/.test(value)) {
    const [first = "", second = ""] = value.split(".");
    return isIpv4Octet(first) && isIpv4Octet(second) ? value : "비공개";
  }
  if (/^\d{1,3}\.\d{1,3}\.\*\.\*$/.test(value)) {
    const [first = "", second = ""] = value.split(".");
    return isIpv4Octet(first) && isIpv4Octet(second) ? `${first}.${second}.***.***` : "비공개";
  }
  if (/^[0-9a-f]{1,4}:[0-9a-f]{1,4}:\*{1,4}(?::\*{1,4})?$/i.test(value)) {
    const [first, second] = value.split(":");
    return `${first}:${second}:****:****`;
  }
  return "비공개";
};
