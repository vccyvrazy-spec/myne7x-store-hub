import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { CreditCard, Upload, DollarSign, ArrowLeft, Package } from 'lucide-react';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
}

const RequestPayment = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    paymentMethod: '',
    contactMethod: 'whatsapp',
    contactValue: '',
    transactionId: '',
    alternativeDetails: ''
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchProduct();
  }, [user, productId, navigate]);

  const fetchProduct = async () => {
    if (!productId) return;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();

      if (error) throw error;
      setProduct(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive"
      });
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const uploadScreenshot = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `payment-screenshots/${user?.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('payment-screenshots')
      .upload(fileName, file);

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('payment-screenshots')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !product) return;

    if (!formData.paymentMethod || !formData.contactValue) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      let screenshotUrl = '';
      
      if (screenshotFile) {
        screenshotUrl = await uploadScreenshot(screenshotFile);
      }

      const { error } = await supabase
        .from('payment_requests')
        .insert({
          user_id: user.id,
          product_id: product.id,
          payment_method: formData.paymentMethod,
          contact_method: formData.contactMethod,
          contact_value: formData.contactValue,
          transaction_id: formData.transactionId || null,
          payment_screenshot_url: screenshotUrl || null,
          alternative_payment_details: formData.alternativeDetails || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Payment Request Submitted",
        description: "Your payment request has been submitted. We'll review it within 24 hours.",
      });

      navigate('/products');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit payment request",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="pt-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-32 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="pt-6">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Product Not Found</h3>
            <Button onClick={() => navigate('/products')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background/50 via-background to-background/50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/products')}
            className="mb-6 hover-scale"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Product Info */}
            <Card className="card-neon">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-glow">
                  <Package className="h-5 w-5" />
                  Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.image_url && (
                  <div className="aspect-video rounded-lg overflow-hidden">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold text-glow">{product.title}</h3>
                  <p className="text-muted-foreground mt-2">{product.description}</p>
                </div>
                <div className="flex items-center gap-2 text-2xl font-bold text-neon-cyan">
                  <DollarSign className="h-6 w-6" />
                  {product.price}
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card className="card-neon">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-glow">
                  <CreditCard className="h-5 w-5" />
                  Payment Request
                </CardTitle>
                <CardDescription>
                  Submit your payment details for manual verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Payment Method */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Payment Method *</Label>
                    <RadioGroup
                      value={formData.paymentMethod}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, paymentMethod: value }))}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bank-transfer" id="bank" />
                        <Label htmlFor="bank">Bank Transfer</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mobile-money" id="mobile" />
                        <Label htmlFor="mobile">Mobile Money</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="crypto" id="crypto" />
                        <Label htmlFor="crypto">Cryptocurrency</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other">Other</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Contact Method */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-method">Contact Method *</Label>
                    <Select
                      value={formData.contactMethod}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, contactMethod: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="phone">Phone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Contact Value */}
                  <div className="space-y-2">
                    <Label htmlFor="contact-value">
                      {formData.contactMethod === 'email' ? 'Email Address' : 
                       formData.contactMethod === 'phone' ? 'Phone Number' :
                       formData.contactMethod === 'whatsapp' ? 'WhatsApp Number' :
                       'Telegram Username'} *
                    </Label>
                    <Input
                      id="contact-value"
                      type={formData.contactMethod === 'email' ? 'email' : 'text'}
                      value={formData.contactValue}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactValue: e.target.value }))}
                      placeholder={
                        formData.contactMethod === 'email' ? 'your@email.com' :
                        formData.contactMethod === 'whatsapp' ? '+1234567890' :
                        formData.contactMethod === 'telegram' ? '@username' :
                        '+1234567890'
                      }
                      required
                    />
                  </div>

                  {/* Transaction ID */}
                  <div className="space-y-2">
                    <Label htmlFor="transaction-id">Transaction ID (Optional)</Label>
                    <Input
                      id="transaction-id"
                      value={formData.transactionId}
                      onChange={(e) => setFormData(prev => ({ ...prev, transactionId: e.target.value }))}
                      placeholder="Enter transaction reference"
                    />
                  </div>

                  {/* Payment Screenshot */}
                  <div className="space-y-2">
                    <Label htmlFor="screenshot">Payment Screenshot (Optional)</Label>
                    <Input
                      id="screenshot"
                      type="file"
                      accept="image/*"
                      onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload a screenshot of your payment confirmation
                    </p>
                  </div>

                  {/* Alternative Details */}
                  <div className="space-y-2">
                    <Label htmlFor="alternative-details">Additional Details (Optional)</Label>
                    <Textarea
                      id="alternative-details"
                      value={formData.alternativeDetails}
                      onChange={(e) => setFormData(prev => ({ ...prev, alternativeDetails: e.target.value }))}
                      placeholder="Any additional payment information..."
                      rows={3}
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={submitting} 
                    className="w-full btn-neon"
                  >
                    {submitting ? (
                      <>
                        <Upload className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Submit Payment Request
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-muted-foreground text-center">
                    Your payment request will be reviewed within 24 hours. 
                    You'll receive access to the product once verified.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestPayment;