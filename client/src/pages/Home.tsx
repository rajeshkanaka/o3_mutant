import ChatInterface from "@/components/ChatInterface";
import { Helmet } from "react-helmet";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>Astra o3 by Rajesh</title>
        <meta name="description" content="Chat interface for OpenAI's O3 model by Rajesh" />
      </Helmet>
      <ChatInterface />
    </>
  );
}
