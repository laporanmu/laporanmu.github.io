import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BROWSERLESS_URL = 'https://production-sfo.browserless.io/pdf'
const STORAGE_BUCKET = 'raport-mbs'

interface RequestBody {
  htmlContent: string
  filename: string
  storagePath: string
  pageSize: 'a4' | 'f4'
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
    })
  }

  try {
    const { htmlContent, filename, storagePath, pageSize }: RequestBody = await req.json()

    if (!htmlContent || !filename) {
      return new Response(JSON.stringify({ error: 'htmlContent and filename are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const browserlessToken = Deno.env.get('BROWSERLESS_API_KEY')
    if (!browserlessToken) {
      return new Response(JSON.stringify({ error: 'BROWSERLESS_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    // Tentukan ukuran kertas (A4 atau F4)
    // F4 = 215mm × 330mm, A4 = 210mm × 297mm
    const pdfOptions = pageSize === 'f4'
      ? { width: '215mm', height: '330mm', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } }
      : { format: 'A4', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } }

    // Panggil Browserless REST API untuk generate PDF dari HTML
    console.log(`Generating PDF for: ${filename} (${pageSize})`)
    const browserlessResponse = await fetch(
      `${BROWSERLESS_URL}?token=${browserlessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: htmlContent,
          options: pdfOptions,
        }),
      }
    )

    if (!browserlessResponse.ok) {
      const errorText = await browserlessResponse.text()
      console.error('Browserless error:', errorText)
      return new Response(JSON.stringify({ error: `Browserless failed: ${errorText}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    const pdfBuffer = await browserlessResponse.arrayBuffer()
    console.log(`PDF generated: ${pdfBuffer.byteLength} bytes`)

    // Upload PDF ke Supabase Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const uploadPath = storagePath || filename
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(uploadPath, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      })
    }

    console.log(`PDF uploaded to: ${uploadPath}`)

    return new Response(
      JSON.stringify({
        success: true,
        path: uploadPath,
        size: pdfBuffer.byteLength,
        filename,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    )
  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    })
  }
})
