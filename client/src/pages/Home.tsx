import ChatInterface from "@/components/ChatInterface";
import { Helmet } from "react-helmet";

export default function Home() {
  return (
    <>
      <Helmet>
        <title>O3 Chat Interface</title>
        <meta name="description" content="Chat interface for OpenAI's O3 model" />
      </Helmet>
      <ChatInterface />
    </>
  );
}
