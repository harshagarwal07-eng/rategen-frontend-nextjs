import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as React from "react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

/* ---------------------------------- Types --------------------------------- */

type PhoneInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> &
  Omit<RPNInput.Props<typeof RPNInput.default>, "onChange"> & {
    onChange?: (value: RPNInput.Value) => void;
    rightIcon?: React.ReactNode;
  };

/* -------------------------------- PhoneInput ------------------------------- */

const PhoneInput = React.forwardRef<React.ElementRef<typeof RPNInput.default>, PhoneInputProps>(
  ({ className, onChange, rightIcon, ...props }, ref) => {
    const StableInputComponent = React.useMemo(
      () =>
        React.forwardRef<HTMLInputElement, InputComponentProps>((inputProps, inputRef) => (
          <InputComponent ref={inputRef} {...inputProps} rightIcon={rightIcon} />
        )),
      [rightIcon]
    );

    return (
      <RPNInput.default
        ref={ref}
        className={cn("flex", className)}
        flagComponent={FlagComponent}
        countrySelectComponent={CountrySelect}
        inputComponent={StableInputComponent}
        /**
         * Handles the onChange event.
         *
         * react-phone-number-input might trigger the onChange event as undefined
         * when a valid phone number is not entered. To prevent this,
         * the value is coerced to an empty string.
         *
         * @param {E164Number | undefined} value - The entered value
         */
        onChange={(value) => onChange?.(value || ("" as RPNInput.Value))}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

/* ------------------------------ InputComponent ----------------------------- */

type InputComponentProps = React.ComponentProps<"input"> & {
  rightIcon?: React.ReactNode;
};

const InputComponent = React.forwardRef<HTMLInputElement, InputComponentProps>(
  ({ className, rightIcon, ...props }, ref) => (
    <Input ref={ref} rightIcon={rightIcon} className={cn("rounded-e-lg rounded-s-none", className)} {...props} />
  )
);

InputComponent.displayName = "InputComponent";

/* ------------------------------ Country Select ----------------------------- */

type CountrySelectOption = {
  label: string;
  value: RPNInput.Country;
};

type CountrySelectProps = {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: CountrySelectOption[];
};

const CountrySelect = ({ disabled, value, onChange, options }: CountrySelectProps) => {
  const [search, setSearch] = React.useState("");

  const handleSelect = React.useCallback(
    (country: RPNInput.Country) => {
      onChange(country);
    },
    [onChange]
  );

  const filteredOptions = React.useMemo(() => {
    const valid = options.filter((x) => x.value);
    const q = search.trim().toLowerCase();
    if (!q) return valid;
    return valid.filter((option) => {
      if (option.label.toLowerCase().includes(q)) return true;
      const code = option.value ? `+${RPNInput.getCountryCallingCode(option.value)}` : "";
      return code.toLowerCase().includes(q);
    });
  }, [options, search]);

  return (
    <Popover onOpenChange={(o) => !o && setSearch("")}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn("w-fit h-10 flex gap-1 rounded-e-none rounded-s-lg px-3 border-2 border-r-0")}
        >
          <FlagComponent country={value} countryName={value} />
          {!disabled && <ChevronsUpDown className="h-4 w-4 opacity-50" />}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="ml-3 p-0 w-[300px]" align="start">
        <Command shouldFilter={false}>
          <CommandList>
            <ScrollArea className="h-72">
              <CommandInput
                placeholder="Search country..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem key={option.value} className="gap-2" onSelect={() => handleSelect(option.value)}>
                    <FlagComponent country={option.value} countryName={option.label} />
                    <span className="flex-1 text-sm">{option.label}</span>
                    {option.value && (
                      <span className="text-foreground/50 text-sm">
                        +{RPNInput.getCountryCallingCode(option.value)}
                      </span>
                    )}
                    <CheckIcon
                      className={cn("ml-auto h-4 w-4", option.value === value ? "opacity-100" : "opacity-0")}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

/* ------------------------------ Flag Component ------------------------------ */

export const FlagComponent = ({ country, countryName }: RPNInput.FlagProps) => {
  const Flag = flags[country];

  return <span className="flex w-4 h-4 rounded-sm overflow-hidden">{Flag && <Flag title={countryName} />}</span>;
};

FlagComponent.displayName = "FlagComponent";

/* ---------------------------------- Export --------------------------------- */

export { PhoneInput };
