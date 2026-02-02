import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Lock } from "lucide-react";

interface PaymentFormProps {
  amount: number;
  onSubmit: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const PaymentForm = ({ amount, onSubmit, onCancel, loading }: PaymentFormProps) => {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [name, setName] = useState("");

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '');
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    return formatted.slice(0, 19);
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cardNumber && expiry && cvv && name) {
      onSubmit();
    }
  };

  const isValid = cardNumber.replace(/\s/g, '').length === 16 && 
                  expiry.length === 5 && 
                  cvv.length === 3 && 
                  name.length > 0;

  return (
    <Card className="border shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl font-light flex items-center gap-2">
          <CreditCard className="w-5 h-5" />
          Payment Details
        </CardTitle>
        <CardDescription className="text-sm">
          Enter your card information to complete the purchase
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="h-11"
              maxLength={19}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input
                id="expiry"
                type="text"
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                className="h-11"
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cvv">CVV</Label>
              <Input
                id="cvv"
                type="text"
                placeholder="123"
                value={cvv}
                onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                className="h-11"
                maxLength={3}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Cardholder Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="pt-4 space-y-3">
            <div className="flex items-center justify-between p-4 rounded border border-border bg-secondary/50">
              <span className="text-sm text-muted-foreground">Amount to pay</span>
              <span className="text-lg font-normal">₹{amount}</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="w-3 h-3" />
              <span>Your payment information is secure</span>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-11"
                onClick={onCancel}
                disabled={loading}
              >
                Back
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11"
                disabled={!isValid || loading}
              >
                {loading ? "Processing..." : `Pay ₹${amount}`}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};