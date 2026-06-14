const durationPattern = /^(\d+)(ms|s|m|h|d)?$/;

export const parseDurationToMs = (value: string): number => {
  const match = durationPattern.exec(value.trim());

  if (!match) {
    throw new Error(`Format durasi tidak valid: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? "s";

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unit durasi tidak valid: ${unit}`);
  }
};

export const parseDurationToSeconds = (value: string): number => {
  return Math.max(1, Math.floor(parseDurationToMs(value) / 1000));
};
