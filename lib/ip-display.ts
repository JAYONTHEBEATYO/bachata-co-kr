const padOctet = (value: string) => value.padStart(3, "0").slice(-3);

const fromDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 2) return "비공개";
  const padded = (digits + "000000").slice(0, 6);
  return `${padded.slice(0, 3)}.${padded.slice(3, 6)}.***.***`;
};

export const displayIpPrefix = (ip: string) => {
  const ipv4 = ip.match(/^(\d{1,3})\.(\d{1,3})\./);
  if (ipv4) return `${padOctet(ipv4[1])}.${padOctet(ipv4[2])}.***.***`;
  return fromDigits(ip);
};

export const normalizeStoredIpPrefix = (value: string | null | undefined) => {
  if (!value) return null;
  if (/^\d{3}\.\d{3}\.\*\*\*\.\*\*\*$/.test(value)) return value;
  if (/^\d{1,3}\.\d{1,3}\.\*\.\*$/.test(value)) {
    const [first = "", second = ""] = value.split(".");
    return `${padOctet(first)}.${padOctet(second)}.***.***`;
  }
  return fromDigits(value);
};
