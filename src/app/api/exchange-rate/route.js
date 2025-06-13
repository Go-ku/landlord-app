// app/api/exchange-rate/route.js
export async function GET() {
    try {
      const rate = await getExchangeRate(); // Same function as above
      return Response.json(rate);
    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  }