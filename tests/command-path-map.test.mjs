import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirrors BaseRestClient.mapCoreCommandPathToCsms (ADAPTER-0006).
function mapCoreCommandPathToCsms(url) {
  const [rawPath, query = ''] = url.split('?');
  const params = new URLSearchParams(query);
  const stationId =
    params.get('identifier') ||
    params.get('stationId') ||
    params.get('id') ||
    '';
  const path = rawPath.replace(/^\//, '');
  const evDriverMap = {
    'evdriver/requestStartTransaction': 'remote-start',
    'evdriver/remoteStartTransaction': 'remote-start',
    'evdriver/requestStopTransaction': 'remote-stop',
    'evdriver/remoteStopTransaction': 'remote-stop',
    'evdriver/unlockConnector': 'unlock-connector',
    'evdriver/clearCache': 'clear-cache',
  };
  const configurationMap = {
    'configuration/reset': 'reset',
    'configuration/changeAvailability': 'change-availability',
    'configuration/triggerMessage': 'trigger-message',
    'configuration/updateFirmware': 'update-firmware',
    'configuration/getConfiguration': 'get-configuration',
    'configuration/changeConfiguration': 'change-configuration',
    'configuration/setNetworkProfile': 'set-network-profile',
    'configuration/password': 'password',
  };
  if (path in evDriverMap && stationId) {
    return `/stations/${encodeURIComponent(stationId)}/ev-driver/${evDriverMap[path]}`;
  }
  if (path in configurationMap && stationId) {
    return `/stations/${encodeURIComponent(stationId)}/configuration/${configurationMap[path]}`;
  }
  return url.startsWith('/') ? url : `/${url}`;
}

test('maps Core reset path to CSMS configuration route', () => {
  assert.equal(
    mapCoreCommandPathToCsms('/configuration/reset?identifier=abc&tenantId=1'),
    '/stations/abc/configuration/reset',
  );
});

test('maps Core remote-start path to CSMS ev-driver route', () => {
  assert.equal(
    mapCoreCommandPathToCsms(
      '/evdriver/remoteStartTransaction?identifier=st-1&tenantId=1',
    ),
    '/stations/st-1/ev-driver/remote-start',
  );
});
