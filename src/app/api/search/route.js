export const config = {
    maxDuration: 50 // Extend up to 60 seconds
};
  
import OpenAI from 'openai';

const openai = new OpenAI();

export  async function GET(request) {

    let connection = false

    const url = new URL(request.url)

    const query = url.searchParams.get("query")

    try {

        const response = await openai.responses.create({
            model: "gpt-4o-mini",
            input: `${query} . List matching product compulsarily with its year, make, model, submodel and chain. `,
            tools: [{
              type: "file_search",
              vector_store_ids: ["vs_67d2683d04d4819194c7c542107b2fab"],
            }],
        });

        // Estimate tokens used in both request and response
        const totalTokens = (query.length + 1000) / 4; // Approximate tokens in input (query + extra tokens)
        const responseTokens = response.output_text.length / 4; // Approximate tokens in response

        // Calculate the total tokens used
        const totalUsedTokens = totalTokens + responseTokens;

        // Price per token based on the pricing model provided (input, cached input, and output)
        const pricePerInputToken = 0.15 / 1000000;  // $0.15 per million input tokens
        const pricePerCachedInputToken = 0.075 / 1000000;  // $0.075 per million cached input tokens
        const pricePerOutputToken = 0.60 / 1000000;  // $0.60 per million output tokens

        // Assuming `totalTokens` and `responseTokens` include both input and output tokens:
        // Calculate costs based on the tokens used
        const inputCost = totalTokens * pricePerInputToken;
        const cachedInputCost = totalTokens * pricePerCachedInputToken;
        const outputCost = responseTokens * pricePerOutputToken;

        // Total cost calculation
        const totalCost = inputCost + cachedInputCost + outputCost;


        return new Response(JSON.stringify({success: true, totalCost, totalUsedTokens, response: response.output_text, query: query }), {
            headers: {
                "Content-Type": "application/json"
            },
            status: 200
        });

    } catch (error) {

        return new Response(JSON.stringify({ success: false, msg: error.message  }), {
            headers: {
                "Content-Type": "application/json"
            },
            status: 200
        });

    } finally{
        if(connection){
            connection.end()
        }
    }
}
