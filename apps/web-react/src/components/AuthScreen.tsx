import { AuthScreenView } from './auth/AuthScreenView';
import { useAuthScreenController } from './auth/useAuthScreenController';

interface AuthScreenProps {
  status: 'new' | 'unencrypted' | 'encrypted' | 'error';
  onSuccess: () => void;
}

export default function AuthScreen({ status, onSuccess }: AuthScreenProps) {
  const model = useAuthScreenController(status, onSuccess);
  return <AuthScreenView model={model} />;
}
