// src/components/admin/config-panel.tsx
"use client";

import { useState, useEffect } from "react";
import { Settings, Server, Key, Check, X, Loader2, Wallet } from "lucide-react";
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Button } from "../ui/button";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface ConfigState {
  rpc: {
    provider: 'helius' | 'quicknode';
    apiKey: string;
    url: string;
    status: 'unconfigured' | 'testing' | 'connected' | 'error';
  };
  railway: {
    apiKey: string;
    projectId: string;
    status: 'unconfigured' | 'testing' | 'connected' | 'error';
  };
}

export function ConfigPanel() {
  const { connected, publicKey } = useWallet();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<ConfigState>({
    rpc: {
      provider: 'helius',
      apiKey: '',
      url: '',
      status: 'unconfigured'
    },
    railway: {
      apiKey: '',
      projectId: '',
      status: 'unconfigured'
    }
  });

  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');

  // Handle wallet connection and load user data
  useEffect(() => {
    async function handleWalletConnection() {
      if (connected && publicKey) {
        setIsLoading(true);
        setError(null);

        try {
          const walletAddress = publicKey.toString();

          // Try to get existing user
          const userResponse = await fetch(`/.netlify/functions/user?walletAddress=${walletAddress}`);
          let userData = await userResponse.json();

          // If user doesn't exist, create new user
          if (!userData || !userData.id) {
            const createResponse = await fetch('/.netlify/functions/user', {
              method: 'POST',
              body: JSON.stringify({ walletAddress })
            });
            userData = await createResponse.json();
          }

          setUserId(userData.id);

          // Load existing config if available
          const configResponse = await fetch(`/.netlify/functions/config?userId=${userData.id}`);
          const existingConfig = await configResponse.json();

          if (existingConfig && !existingConfig.error) {
            setConfig({
              rpc: {
                provider: existingConfig.rpc_provider,
                apiKey: existingConfig.rpc_api_key,
                url: existingConfig.rpc_url || '',
                status: 'connected'
              },
              railway: {
                apiKey: existingConfig.railway_api_key,
                projectId: existingConfig.railway_project_id,
                status: 'connected'
              }
            });
          }
        } catch (err) {
          console.error('Error loading user data:', err);
          setError(err instanceof Error ? err.message : 'Failed to load user data');
        } finally {
          setIsLoading(false);
        }
      }
    }

    handleWalletConnection();
  }, [connected, publicKey]);

  const testRPCConnection = async () => {
    setConfig(prev => ({
      ...prev,
      rpc: { ...prev.rpc, status: 'testing' }
    }));

    try {
      const wsUrl = config.rpc.provider === 'helius'
        ? `wss://rpc-ws.helius.xyz/?api-key=${config.rpc.apiKey}`
        : config.rpc.url;

      const ws = new WebSocket(wsUrl);

      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          ws.close();
          resolve(true);
        };
        ws.onerror = (error) => reject(error);
        setTimeout(() => reject(new Error('Connection timeout')), 5000);
      });

      setConfig(prev => ({
        ...prev,
        rpc: { ...prev.rpc, status: 'connected' }
      }));
    } catch (error) {
      console.error('RPC connection error:', error);
      setConfig(prev => ({
        ...prev,
        rpc: { ...prev.rpc, status: 'error' }
      }));
    }
  };

  const testRailwaySetup = async () => {
    setConfig(prev => ({
      ...prev,
      railway: { ...prev.railway, status: 'testing' }
    }));

    try {
      const response = await fetch('https://backboard.railway.app/graphql/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.railway.apiKey}`
        },
        body: JSON.stringify({
          query: `
            query {
              project(id: "${config.railway.projectId}") {
                id
                name
              }
            }
          `
        })
      });

      const data = await response.json();

      if (data.data?.project) {
        setConfig(prev => ({
          ...prev,
          railway: { ...prev.railway, status: 'connected' }
        }));
      } else {
        throw new Error('Invalid project credentials');
      }
    } catch (error) {
      console.error('Railway connection error:', error);
      setConfig(prev => ({
        ...prev,
        railway: { ...prev.railway, status: 'error' }
      }));
    }
  };

  const handleSaveConfig = async () => {
    if (!userId || config.rpc.status !== 'connected' || config.railway.status !== 'connected') {
      return;
    }

    setDeploymentStatus('deploying');

    try {
      const configData = {
        user_id: userId,
        rpc_provider: config.rpc.provider,
        rpc_api_key: config.rpc.apiKey,
        rpc_url: config.rpc.url,
        railway_api_key: config.railway.apiKey,
        railway_project_id: config.railway.projectId
      };

      const response = await fetch('/.netlify/functions/config', {
        method: 'POST',
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      setDeploymentStatus('success');
    } catch (error) {
      console.error('Save config error:', error);
      setDeploymentStatus('error');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      case 'testing':
        return 'text-yellow-500';
      default:
        return 'text-gray-500';
    }
  };

  if (!connected) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Connect Wallet
          </CardTitle>
          <CardDescription>
            Connect your Solana wallet to configure your alert service
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WalletMultiButton className="w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="py-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* RPC Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            RPC Configuration
          </CardTitle>
          <CardDescription>
            Configure your Solana RPC provider settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select
              value={config.rpc.provider}
              onValueChange={(value: 'helius' | 'quicknode') =>
                setConfig(prev => ({
                  ...prev,
                  rpc: { ...prev.rpc, provider: value, apiKey: '', url: '', status: 'unconfigured' }
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="helius">Helius</SelectItem>
                <SelectItem value="quicknode">QuickNode</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.rpc.provider === 'helius' ? (
            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Enter your Helius API key"
                value={config.rpc.apiKey}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  rpc: { ...prev.rpc, apiKey: e.target.value, status: 'unconfigured' }
                }))}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>WebSocket URL</Label>
              <Input
                placeholder="Enter your QuickNode WebSocket URL"
                value={config.rpc.url}
                onChange={(e) => setConfig(prev => ({
                  ...prev,
                  rpc: { ...prev.rpc, url: e.target.value, status: 'unconfigured' }
                }))}
              />
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <Button
            onClick={testRPCConnection}
            disabled={config.rpc.status === 'testing'}
          >
            {config.rpc.status === 'testing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          {config.rpc.status !== 'unconfigured' && (
            <div className={`flex items-center gap-2 ${getStatusColor(config.rpc.status)}`}>
              {config.rpc.status === 'connected' ? (
                <Check className="h-4 w-4" />
              ) : config.rpc.status === 'error' ? (
                <X className="h-4 w-4" />
              ) : null}
              {config.rpc.status.charAt(0).toUpperCase() + config.rpc.status.slice(1)}
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Railway Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Railway Configuration
          </CardTitle>
          <CardDescription>
            Configure your Railway deployment settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="Enter your Railway API key"
              value={config.railway.apiKey}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                railway: { ...prev.railway, apiKey: e.target.value, status: 'unconfigured' }
              }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Project ID</Label>
            <Input
              placeholder="Enter your Railway project ID"
              value={config.railway.projectId}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                railway: { ...prev.railway, projectId: e.target.value, status: 'unconfigured' }
              }))}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between items-center">
          <Button
            onClick={testRailwaySetup}
            disabled={config.railway.status === 'testing'}
          >
            {config.railway.status === 'testing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          {config.railway.status !== 'unconfigured' && (
            <div className={`flex items-center gap-2 ${getStatusColor(config.railway.status)}`}>
              {config.railway.status === 'connected' ? (
                <Check className="h-4 w-4" />
              ) : config.railway.status === 'error' ? (
                <X className="h-4 w-4" />
              ) : null}
              {config.railway.status.charAt(0).toUpperCase() + config.railway.status.slice(1)}
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Save Configuration Button */}
      <div className="flex justify-center">
        <Button
          size="lg"
          className="w-full max-w-md"
          disabled={
            !userId ||
            config.rpc.status !== 'connected' ||
            config.railway.status !== 'connected' ||
            deploymentStatus === 'deploying'
          }
          onClick={handleSaveConfig}
        >
          {deploymentStatus === 'deploying' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </div>

      {/* Status Messages */}
      {deploymentStatus === 'success' && (
        <Alert className="bg-green-50 border-green-200">
          <Check className="h-4 w-4 text-green-500" />
          <AlertDescription>
            Configuration saved successfully!
          </AlertDescription>
        </Alert>
      )}

      {deploymentStatus === 'error' && (
        <Alert className="bg-red-50 border-red-200">
          <X className="h-4 w-4 text-red-500" />
          <AlertDescription>
            Failed to save configuration. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* Display current wallet */}
      <div className="mt-4 text-center text-sm text-gray-500">
        Connected wallet: {publicKey?.toString()}
      </div>
    </div>
  );
}
