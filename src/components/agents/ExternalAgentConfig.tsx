import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
} from '@evoapi/design-system';
import { Settings, Save, Loader2, AlertCircle } from 'lucide-react';
import integrationService from '@/services/agents/integrationService';
import { useLanguage } from '@/hooks/useLanguage';
import { ProviderType } from './ProviderSelector';
import {
  FlowiseConfigForm,
  FlowiseConfig,
  N8NConfigForm,
  N8NConfig,
  DifyConfigForm,
  DifyConfig,
  OpenAIConfigForm,
  OpenAIConfig,
  TypebotConfigForm,
  TypebotConfig,
} from './providerConfigs';

type AgentPageMode = 'create' | 'edit' | 'view';

export interface ExternalAgentConfigData {
  provider?: ProviderType;
  // Flowise config
  flowise_apiUrl?: string;
  flowise_apiKey?: string;
  // N8N config
  n8n_webhookUrl?: string;
  n8n_basicAuthUser?: string;
  n8n_basicAuthPass?: string;
  // Dify config
  dify_apiUrl?: string;
  dify_apiKey?: string;
  dify_botType?: 'chatBot' | 'textGenerator' | 'agent';
  // OpenAI config
  openai_apiKey?: string;
  openai_botType?: 'assistant' | 'chatCompletion';
  openai_assistantId?: string;
  openai_model?: string;
  openai_maxTokens?: number;
  // Typebot config
  typebot_url?: string;
  typebot_typebot?: string;
  typebot_apiVersion?: 'latest' | string;
  typebot_apiKey?: string;
}

interface ExternalAgentConfigProps {
  mode: AgentPageMode;
  agentId?: string;
  data: ExternalAgentConfigData;
  onChange: (data: ExternalAgentConfigData) => void;
  onValidationChange: (isValid: boolean, errors: string[]) => void;
}

const ExternalAgentConfig = ({
  mode,
  agentId,
  data,
  onChange,
  onValidationChange,
}: ExternalAgentConfigProps) => {
  const { t } = useLanguage('aiAgents');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Internal state so loaded values survive parent re-renders that only pass provider
  const [internalData, setInternalData] = useState<ExternalAgentConfigData>(data);
  const prevProviderRef = useRef(data.provider);

  // Sync provider changes from parent without losing loaded field values
  useEffect(() => {
    if (data.provider !== prevProviderRef.current) {
      prevProviderRef.current = data.provider;
      setInternalData(prev => ({ ...prev, provider: data.provider }));
    }
  }, [data.provider]);

  // Load integration config when editing
  useEffect(() => {
    if (mode === 'edit' && agentId && internalData.provider) {
      loadIntegration();
    }
  }, [agentId, internalData.provider, mode]);

  const loadIntegration = async () => {
    if (!agentId || !internalData.provider) return;

    try {
      setIsLoading(true);
      const integration = await integrationService.getIntegration(agentId, internalData.provider);
      const config = integration.config || {};

      // Map config to form data based on provider
      const newData: ExternalAgentConfigData = { ...internalData };

      if (internalData.provider === 'flowise') {
        newData.flowise_apiUrl = config.apiUrl || '';
        newData.flowise_apiKey = config.apiKey || '';
      } else if (internalData.provider === 'n8n') {
        newData.n8n_webhookUrl = config.webhookUrl || '';
        newData.n8n_basicAuthUser = config.basicAuthUser || '';
        newData.n8n_basicAuthPass = config.basicAuthPass || '';
      } else if (internalData.provider === 'dify') {
        newData.dify_apiUrl = config.apiUrl || '';
        newData.dify_apiKey = config.apiKey || '';
        newData.dify_botType = config.botType || 'chatBot';
      } else if (internalData.provider === 'openai') {
        newData.openai_apiKey = config.apiKey || '';
        newData.openai_botType = config.botType || 'assistant';
        newData.openai_assistantId = config.assistantId || '';
        newData.openai_model = config.model || '';
        newData.openai_maxTokens = config.maxTokens || 500;
      } else if (internalData.provider === 'typebot') {
        newData.typebot_url = config.url || '';
        newData.typebot_typebot = config.typebot || '';
        newData.typebot_apiVersion = config.apiVersion || 'latest';
        // apiKey is sensitive — not returned by backend; leave empty for re-entry if needed
        newData.typebot_apiKey = '';
      }

      setInternalData(newData);
      onChange(newData);
    } catch (error) {
      console.error('Error loading integration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!internalData.provider) {
      newErrors.provider = t('edit.configuration.sections.externalIntegration.errors.providerRequired');
      return newErrors;
    }

    // Validate based on provider
    if (internalData.provider === 'flowise') {
      if (!internalData.flowise_apiUrl?.trim()) {
        newErrors.flowise_apiUrl = t('edit.configuration.sections.externalIntegration.errors.apiUrlRequired');
      }
    } else if (internalData.provider === 'n8n') {
      if (!internalData.n8n_webhookUrl?.trim()) {
        newErrors.n8n_webhookUrl = t('edit.configuration.sections.externalIntegration.errors.webhookUrlRequired');
      }
    } else if (internalData.provider === 'dify') {
      if (!internalData.dify_apiUrl?.trim()) {
        newErrors.dify_apiUrl = t('edit.configuration.sections.externalIntegration.errors.apiUrlRequired');
      }
      if (!internalData.dify_apiKey?.trim()) {
        newErrors.dify_apiKey = t('edit.configuration.sections.externalIntegration.errors.apiKeyRequired');
      }
    } else if (internalData.provider === 'openai') {
      if (!internalData.openai_apiKey?.trim()) {
        newErrors.openai_apiKey = t('edit.configuration.sections.externalIntegration.errors.apiKeyRequired');
      }
      if (internalData.openai_botType === 'assistant' && !internalData.openai_assistantId?.trim()) {
        newErrors.openai_assistantId = t('edit.configuration.sections.externalIntegration.errors.assistantIdRequired');
      }
      if (internalData.openai_botType === 'chatCompletion' && !internalData.openai_model?.trim()) {
        newErrors.openai_model = t('edit.configuration.sections.externalIntegration.errors.modelRequired');
      }
    } else if (internalData.provider === 'typebot') {
      if (!internalData.typebot_url?.trim()) {
        newErrors.typebot_url = t('edit.configuration.sections.externalIntegration.errors.urlRequired');
      }
      if (!internalData.typebot_typebot?.trim()) {
        newErrors.typebot_typebot = t('edit.configuration.sections.externalIntegration.errors.typebotIdRequired');
      }
    }

    return newErrors;
  }, [internalData]);

  useEffect(() => {
    const newErrors = validateForm();
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    const errorMessages = Object.values(newErrors);

    const timer = setTimeout(() => {
      onValidationChange(isValid, errorMessages);
    }, 0);

    return () => clearTimeout(timer);
  }, [validateForm, onValidationChange]);

  const handleProviderConfigChange = (providerConfig: FlowiseConfig | N8NConfig | DifyConfig | OpenAIConfig | TypebotConfig) => {
    const newData: ExternalAgentConfigData = { ...internalData };

    if (internalData.provider === 'flowise') {
      const flowiseConfig = providerConfig as FlowiseConfig;
      newData.flowise_apiUrl = flowiseConfig.apiUrl;
      newData.flowise_apiKey = flowiseConfig.apiKey;
    } else if (internalData.provider === 'n8n') {
      const n8nConfig = providerConfig as N8NConfig;
      newData.n8n_webhookUrl = n8nConfig.webhookUrl;
      newData.n8n_basicAuthUser = n8nConfig.basicAuthUser;
      newData.n8n_basicAuthPass = n8nConfig.basicAuthPass;
    } else if (internalData.provider === 'dify') {
      const difyConfig = providerConfig as DifyConfig;
      newData.dify_apiUrl = difyConfig.apiUrl;
      newData.dify_apiKey = difyConfig.apiKey;
      newData.dify_botType = difyConfig.botType;
    } else if (internalData.provider === 'openai') {
      const openaiConfig = providerConfig as OpenAIConfig;
      newData.openai_apiKey = openaiConfig.apiKey;
      newData.openai_botType = openaiConfig.botType;
      newData.openai_assistantId = openaiConfig.assistantId;
      newData.openai_model = openaiConfig.model;
      newData.openai_maxTokens = openaiConfig.maxTokens;
    } else if (internalData.provider === 'typebot') {
      const typebotConfig = providerConfig as TypebotConfig;
      newData.typebot_url = typebotConfig.url;
      newData.typebot_typebot = typebotConfig.typebot;
      newData.typebot_apiVersion = typebotConfig.apiVersion;
      newData.typebot_apiKey = typebotConfig.apiKey;
    }

    setInternalData(newData);
    onChange(newData);
  };

  const providerConfig = useMemo((): FlowiseConfig | N8NConfig | DifyConfig | OpenAIConfig | TypebotConfig => {
    if (internalData.provider === 'flowise') {
      return {
        apiUrl: internalData.flowise_apiUrl ?? '',
        apiKey: internalData.flowise_apiKey ?? '',
      };
    } else if (internalData.provider === 'n8n') {
      return {
        webhookUrl: internalData.n8n_webhookUrl ?? '',
        basicAuthUser: internalData.n8n_basicAuthUser ?? '',
        basicAuthPass: internalData.n8n_basicAuthPass ?? '',
      };
    } else if (internalData.provider === 'dify') {
      return {
        apiUrl: internalData.dify_apiUrl ?? '',
        apiKey: internalData.dify_apiKey ?? '',
        botType: internalData.dify_botType ?? 'chatBot',
      };
    } else if (internalData.provider === 'openai') {
      return {
        apiKey: internalData.openai_apiKey ?? '',
        botType: internalData.openai_botType ?? 'assistant',
        assistantId: internalData.openai_assistantId ?? '',
        model: internalData.openai_model ?? '',
        maxTokens: internalData.openai_maxTokens ?? 500,
      };
    } else if (internalData.provider === 'typebot') {
      return {
        url: internalData.typebot_url ?? '',
        typebot: internalData.typebot_typebot ?? '',
        apiVersion: internalData.typebot_apiVersion ?? 'latest',
        apiKey: internalData.typebot_apiKey ?? '',
      };
    }
    return {};
  }, [
    internalData.provider,
    internalData.flowise_apiUrl,
    internalData.flowise_apiKey,
    internalData.n8n_webhookUrl,
    internalData.n8n_basicAuthUser,
    internalData.n8n_basicAuthPass,
    internalData.dify_apiUrl,
    internalData.dify_apiKey,
    internalData.dify_botType,
    internalData.openai_apiKey,
    internalData.openai_botType,
    internalData.openai_assistantId,
    internalData.openai_model,
    internalData.openai_maxTokens,
    internalData.typebot_url,
    internalData.typebot_typebot,
    internalData.typebot_apiVersion,
    internalData.typebot_apiKey,
  ]);


  const handleSaveIntegration = async () => {
    if (!agentId || !internalData.provider) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSaving(true);

      // Build config based on provider
      const config: Record<string, any> = {};
      if (internalData.provider === 'flowise') {
        config.apiUrl = internalData.flowise_apiUrl;
        config.apiKey = internalData.flowise_apiKey;
      } else if (internalData.provider === 'n8n') {
        config.webhookUrl = internalData.n8n_webhookUrl;
        config.basicAuthUser = internalData.n8n_basicAuthUser;
        config.basicAuthPass = internalData.n8n_basicAuthPass;
      } else if (internalData.provider === 'dify') {
        config.apiUrl = internalData.dify_apiUrl;
        config.apiKey = internalData.dify_apiKey;
        config.botType = internalData.dify_botType || 'chatBot';
      } else if (internalData.provider === 'openai') {
        config.apiKey = internalData.openai_apiKey;
        config.botType = internalData.openai_botType || 'assistant';
        config.assistantId = internalData.openai_assistantId;
        config.model = internalData.openai_model;
        config.maxTokens = internalData.openai_maxTokens || 500;
      } else if (internalData.provider === 'typebot') {
        config.url = internalData.typebot_url;
        config.typebot = internalData.typebot_typebot;
        config.apiVersion = internalData.typebot_apiVersion || 'latest';
        if (internalData.typebot_apiKey?.trim()) {
          config.apiKey = internalData.typebot_apiKey;
        }
      }

      await integrationService.upsertIntegration(agentId, {
        provider: internalData.provider,
        config,
      });
    } catch (error) {
      console.error('Error saving integration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const providerErrors = useMemo(() => {
    const providerErrs: Record<string, string> = {};

    if (internalData.provider === 'flowise') {
      if (errors.flowise_apiUrl) providerErrs.apiUrl = errors.flowise_apiUrl;
    } else if (internalData.provider === 'n8n') {
      if (errors.n8n_webhookUrl) providerErrs.webhookUrl = errors.n8n_webhookUrl;
    } else if (internalData.provider === 'dify') {
      if (errors.dify_apiUrl) providerErrs.apiUrl = errors.dify_apiUrl;
      if (errors.dify_apiKey) providerErrs.apiKey = errors.dify_apiKey;
    } else if (internalData.provider === 'openai') {
      if (errors.openai_apiKey) providerErrs.apiKey = errors.openai_apiKey;
      if (errors.openai_assistantId) providerErrs.assistantId = errors.openai_assistantId;
      if (errors.openai_model) providerErrs.model = errors.openai_model;
    } else if (internalData.provider === 'typebot') {
      if (errors.typebot_url) providerErrs.url = errors.typebot_url;
      if (errors.typebot_typebot) providerErrs.typebot = errors.typebot_typebot;
    }

    return providerErrs;
  }, [internalData.provider, errors]);

  const renderProviderForm = () => {
    if (!internalData.provider) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {t('edit.configuration.sections.externalIntegration.providerConfig.selectProvider')}
        </div>
      );
    }

    const isReadOnly = mode === 'view';

    switch (internalData.provider) {
      case 'flowise':
        return (
          <FlowiseConfigForm
            config={providerConfig as FlowiseConfig}
            onChange={handleProviderConfigChange}
            errors={providerErrors}
            disabled={isReadOnly}
          />
        );
      case 'n8n':
        return (
          <N8NConfigForm
            config={providerConfig as N8NConfig}
            onChange={handleProviderConfigChange}
            errors={providerErrors}
            disabled={isReadOnly}
          />
        );
      case 'dify':
        return (
          <DifyConfigForm
            config={providerConfig as DifyConfig}
            onChange={handleProviderConfigChange}
            errors={providerErrors}
            disabled={isReadOnly}
          />
        );
      case 'openai':
        return (
          <OpenAIConfigForm
            config={providerConfig as OpenAIConfig}
            onChange={handleProviderConfigChange}
            errors={providerErrors}
            disabled={isReadOnly}
          />
        );
      case 'typebot':
        return (
          <TypebotConfigForm
            config={providerConfig as TypebotConfig}
            onChange={handleProviderConfigChange}
            errors={providerErrors}
            disabled={isReadOnly}
          />
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Settings className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle>{t('edit.configuration.sections.externalIntegration.providerConfig.title')}</CardTitle>
              <CardDescription>
                {t('edit.configuration.sections.externalIntegration.providerConfig.subtitle')}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Security Alert */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-700 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <h6 className="font-medium text-amber-700 dark:text-amber-300 mb-1">
                {t('edit.configuration.sections.externalIntegration.securityAlert.title')}
              </h6>
              <p className="text-amber-600 dark:text-amber-400">
                {t('edit.configuration.sections.externalIntegration.securityAlert.description')}
              </p>
            </div>
          </div>

          {renderProviderForm()}

          {mode === 'edit' && agentId && (
            <div className="pt-4">
              <Button
                onClick={handleSaveIntegration}
                disabled={isSaving || Object.keys(errors).length > 0}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('edit.configuration.sections.externalIntegration.providerConfig.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('edit.configuration.sections.externalIntegration.providerConfig.save')}
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExternalAgentConfig;
