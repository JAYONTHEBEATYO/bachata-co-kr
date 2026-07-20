const isIpv4Octet = (value: string) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 255;
};

export const displayIpPrefix = (ip: string) => {
  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4 && ipv4.slice(1).every(isIpv4Octet)) {
    return `${ipv4[1]}.${ipv4[2]}.***.***`;
  }

  const ipv6 = ip.toLowerCase().match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})(?::|$)/);
  if (ipv6) return `${ipv6[1]}:${ipv6[2]}:****:****`;

  return "비공개";
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
