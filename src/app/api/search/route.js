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

        return new Response(JSON.stringify({success: true, response: response.output_text, query: query }), {
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
