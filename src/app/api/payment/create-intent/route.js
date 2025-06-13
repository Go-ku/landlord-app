// app/api/payment/create-intent/route.js
export async function POST(req) {
    try {
      const { amount, currency, tenantId, propertyId } = await req.json();
      
      // Get current exchange rate (you'll need an API for live rates)
      const exchangeRate = currency === 'ZMW' ? await getExchangeRate() : 1;
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * (currency === 'ZMW' ? exchangeRate : 1)),
        currency: 'usd', // Stripe settles in USD
        metadata: {
          tenantId,
          propertyId,
          originalCurrency: currency,
          originalAmount: amount,
          exchangeRate
        }
      });
  
      return Response.json({ 
        clientSecret: paymentIntent.client_secret,
        exchangeRate
      });
    } catch (err) {
      // ... error handling
    }
  }
  
  async function getExchangeRate() {
    // Implement with your preferred exchange rate API
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await res.json();
    return data.rates.ZMW;
  }