export const formatNumber = (value: number, digits = 1) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(digits)}m`;
  }

  if (abs >= 10_000) {
    return `${(value / 1_000).toFixed(digits)}k`;
  }

  if (abs >= 100) {
    return value.toFixed(0);
  }

  if (abs >= 10) {
    return value.toFixed(1);
  }

  return value.toFixed(2);
};

export const formatSignedRate = (value: number | undefined) => {
  const normalized = value ?? 0;
  if (Math.abs(normalized) < 0.005) {
    return '0/s';
  }

  return `${normalized > 0 ? '+' : ''}${formatNumber(normalized, 2)}/s`;
};

export const formatDuration = (seconds: number) => {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${remainingSeconds.toString().padStart(2, '0')}s`;
};
