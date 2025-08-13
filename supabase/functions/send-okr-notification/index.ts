import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  userEmail: string;
  okrTitle: string;
  action: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userEmail, okrTitle, action }: EmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "OKR Manager <onboarding@resend.dev>",
      to: [userEmail],
      subject: `OKR ${action}: ${okrTitle}`,
      html: `
        <h1>OKR ${action}</h1>
        <p>Your OKR "<strong>${okrTitle}</strong>" has been ${action.toLowerCase()}.</p>
        <p>Visit your dashboard to view all your OKRs.</p>
        <p>Best regards,<br>The OKR Manager Team</p>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);