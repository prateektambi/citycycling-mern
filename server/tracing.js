const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-proto');
const diag = require('@opentelemetry/api').diag;
const DiagConsoleLogger = require('@opentelemetry/api').DiagConsoleLogger;
const DiagLogLevel = require('@opentelemetry/api').DiagLogLevel;

// Optional internal debugging for OpenTelemetry
if (process.env.OTEL_DEBUG === 'true') {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG);
}

const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
const headers = process.env.OTEL_EXPORTER_OTLP_HEADERS;

let traceExporter;

if (endpoint) {
  const options = {
    url: endpoint.endsWith('/v1/traces') ? endpoint : `${endpoint}/v1/traces`,
  };

  if (headers) {
    // Parse headers like "Authorization=Basic ...,Key=Value"
    const headersObj = {};
    headers.split(',').forEach(header => {
      const parts = header.split('=');
      if (parts.length === 2) {
        headersObj[parts[0].trim()] = parts[1].trim();
      }
    });
    options.headers = headersObj;
  }

  traceExporter = new OTLPTraceExporter(options);
  console.log(`[OTel] Tracing initialized exporting to: ${options.url}`);
} else {
  console.log('[OTel] No OTLP endpoint configured. Traces will not be sent.');
}

if (traceExporter) {
  const sdk = new NodeSDK({
    traceExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Disable filesystem auto-instrumentation to avoid noisy traces
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
      }),
    ],
    serviceName: process.env.OTEL_SERVICE_NAME || 'citycycling-express',
  });

  sdk.start();

  process.on('SIGTERM', () => {
    sdk.shutdown()
      .then(() => console.log('[OTel] Tracing terminated gracefully'))
      .catch((error) => console.error('[OTel] Error terminating tracing', error))
      .finally(() => process.exit(0));
  });
}
