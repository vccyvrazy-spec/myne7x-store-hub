import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Search, Package, DollarSign, Download } from 'lucide-react';
import DownloadComponent from '@/components/DownloadComponent';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  tags: string[];
  feature_images: string[];
  is_active: boolean;
  file_url?: string;
}

interface UserAccess {
  product_id: string;
}

interface PaymentRequest {
  id: string;
  product_id: string;
  status: string;
}

const Products = () => {
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadingProduct, setDownloadingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
    if (user) {
      fetchUserAccess();
      fetchPaymentRequests();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserAccess = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_product_access')
        .select('product_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserAccess(data || []);
    } catch (error) {
      console.error('Error fetching user access:', error);
    }
  };

  const fetchPaymentRequests = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('payment_requests')
        .select('id, product_id, status')
        .eq('user_id', user.id);

      if (error) throw error;
      setPaymentRequests(data || []);
    } catch (error) {
      console.error('Error fetching payment requests:', error);
    }
  };

  const hasAccess = (productId: string) => {
    return userAccess.some(access => access.product_id === productId);
  };

  const getPaymentStatus = (productId: string) => {
    const request = paymentRequests.find(req => req.product_id === productId);
    return request?.status || null;
  };

  const handleDownload = async (product: Product) => {
    if (isAdmin) {
      // Admin can download immediately without countdown
      try {
        if (product.file_url) {
          // Get direct download URL from Supabase storage
          const { data } = await supabase.storage
            .from('product-files')
            .createSignedUrl(product.file_url.split('/').pop() || '', 3600);
          
          if (data?.signedUrl) {
            const link = document.createElement('a');
            link.href = data.signedUrl;
            link.download = product.title;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({
              title: "Download Started",
              description: `${product.title} download has begun`,
            });
          } else {
            throw new Error('Unable to create download link');
          }
        } else {
          throw new Error('No file URL found');
        }
      } catch (error) {
        toast({
          title: "Download Failed",
          description: "Unable to download the file",
          variant: "destructive"
        });
      }
      return;
    }

    if (!hasAccess(product.id)) {
      toast({
        title: "Access Denied",
        description: "You need to purchase this product first",
        variant: "destructive"
      });
      return;
    }

    // Start download component
    setDownloadingProduct(product);
  };

  const getButtonState = (product: Product) => {
    if (!user) {
      return { text: 'Sign in to Purchase', variant: 'outline' as const, action: () => window.location.href = '/auth' };
    }

    if (hasAccess(product.id)) {
      return { 
        text: 'Download', 
        variant: 'default' as const, 
        action: () => handleDownload(product),
        icon: Download
      };
    }

    const paymentStatus = getPaymentStatus(product.id);
    
    if (paymentStatus === 'pending') {
      return { text: 'Request Pending', variant: 'secondary' as const, disabled: true };
    }
    
    if (paymentStatus === 'rejected') {
      return { text: 'Request Rejected - Try Again', variant: 'destructive' as const, action: () => window.location.href = `/request-payment/${product.id}` };
    }

    return { 
      text: product.price === 0 ? 'Get Free Access' : `Request Access - $${product.price}`, 
      variant: 'default' as const,
      action: () => window.location.href = `/request-payment/${product.id}`,
      className: 'btn-neon'
    };
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background/50 via-background to-background/50 py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="h-48 bg-muted rounded-t-lg"></div>
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background/50 via-background to-background/50 py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-4 text-glow">Digital Products</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
            Discover our collection of premium digital products and free resources
          </p>
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="container mx-auto px-4">
          {filteredProducts.length === 0 ? (
            <Card className="text-center py-12 card-neon max-w-md mx-auto">
              <CardContent>
                <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No products found</h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'No products are currently available'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="overflow-hidden card-neon hover-scale">
                  {product.image_url && (
                    <div 
                      className="h-48 overflow-hidden cursor-pointer"
                      onClick={() => window.location.href = `/product/${product.id}`}
                    >
                      <img
                        src={product.image_url}
                        alt={product.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle 
                        className="text-lg cursor-pointer hover:text-primary transition-colors"
                        onClick={() => window.location.href = `/product/${product.id}`}
                      >
                        {product.title}
                      </CardTitle>
                      <Badge variant={product.price === 0 ? "default" : "secondary"} className="ml-2">
                        {product.price === 0 ? (
                          <>FREE</>
                        ) : (
                          <>
                            <DollarSign className="h-3 w-3 mr-1" />
                            {product.price}
                          </>
                        )}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-2">
                      {product.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1 mb-4">
                      {product.category && (
                        <Badge variant="outline">{product.category}</Badge>
                      )}
                      {product.tags?.slice(0, 2).map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    
                    {(() => {
                      const buttonState = getButtonState(product);
                      const Icon = buttonState.icon;
                      
                      return (
                        <Button 
                          onClick={buttonState.action}
                          className={`w-full ${buttonState.className || ''}`}
                          variant={buttonState.variant}
                          disabled={buttonState.disabled}
                        >
                          {Icon && <Icon className="h-4 w-4 mr-2" />}
                          {buttonState.text}
                        </Button>
                      );
                    })()}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Download Component */}
        {downloadingProduct && (
          <DownloadComponent 
            product={downloadingProduct}
            onClose={() => setDownloadingProduct(null)}
          />
        )}
      </div>
    </div>
  );
};

export default Products;