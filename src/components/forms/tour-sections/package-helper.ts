// Helper function for numeric input handling
export const handleNumericChange = (
  setter: (value: any) => void,
  value: string,
  isInteger = false
) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    setter(undefined);
    return;
  }
  // Allow numbers and decimal point
  if (/^\d*\.?\d*$/.test(trimmedValue)) {
    const numValue = isInteger
      ? parseInt(trimmedValue)
      : parseFloat(trimmedValue);
    if (!isNaN(numValue)) {
      setter(numValue);
    }
  }
};

// Helper function for duration fields with max validation
export const handleDurationChange = (
  setter: (value: any) => void,
  value: string,
  maxValue: number = 60
) => {
  const trimmedValue = value.trim();
  if (trimmedValue === "") {
    setter(undefined);
    return;
  }
  // Allow only integers
  if (/^\d+$/.test(trimmedValue)) {
    let numValue = parseInt(trimmedValue);
    if (!isNaN(numValue)) {
      // Cap at maxValue
      if (numValue > maxValue) {
        numValue = maxValue;
      }
      setter(numValue);
    }
  }
};
