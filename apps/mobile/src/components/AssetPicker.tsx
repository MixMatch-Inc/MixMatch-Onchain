import type { StellarAsset } from '@mixmatch/shared';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { addTrustline, getAssets } from '../services/wallet-client';
import { ErrorState } from './states';

export interface AssetPickerProps {
  accessToken: string;
  selected: StellarAsset | null;
  onSelect: (asset: StellarAsset) => void;
}

/** Lists verified assets and lets the user add a trustline before sending (#1386). */
export default function AssetPicker({ accessToken, selected, onSelect }: AssetPickerProps) {
  const [assets, setAssets] = useState<StellarAsset[]>([]);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const { assets: rows } = await getAssets(accessToken);
      setAssets(rows);
    } catch {
      setError(true);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async (asset: StellarAsset) => {
    if (!asset.issuer) return;
    setLoadingId(asset.code);
    try {
      await addTrustline(asset.code, asset.issuer, accessToken);
      await load();
      onSelect(asset);
    } catch {
      setError(true);
    } finally {
      setLoadingId(null);
    }
  };

  if (error) {
    return <ErrorState message="Could not load assets." action={{ label: 'Retry', onPress: () => void load() }} />;
  }

  return (
    <View style={styles.container} testID="asset-picker">
      {assets.length === 0 && <ActivityIndicator style={styles.loading} />}
      {assets.map((asset) => {
        const key = `${asset.code}:${asset.issuer ?? 'native'}`;
        const active = selected && `${selected.code}:${selected.issuer ?? 'native'}` === key;
        return (
          <View style={styles.row} key={key} testID={`asset-${asset.code}`}>
            <TouchableOpacity
              style={[styles.select, active && styles.active]}
              onPress={() => (asset.trustlineEstablished || !asset.issuer ? onSelect(asset) : void handleAdd(asset))}
              testID={`select-asset-${asset.code}`}
            >
              <Text style={styles.code}>{asset.code}</Text>
              <Text style={styles.detail}>{asset.name ?? (asset.issuer ? 'Custom asset' : 'Native')}</Text>
            </TouchableOpacity>
            {loadingId === asset.code ? (
              <ActivityIndicator />
            ) : !asset.trustlineEstablished && asset.issuer ? (
              <TouchableOpacity onPress={() => void handleAdd(asset)} testID={`add-trustline-${asset.code}`}>
                <Text style={styles.add}>Add</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.ok}>{active ? 'Selected' : 'Ready'}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  loading: { marginVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 8 },
  select: { flex: 1 },
  active: { opacity: 0.6 },
  code: { fontWeight: '600' },
  detail: { fontSize: 12, color: '#666' },
  add: { color: '#0066cc', fontWeight: '600' },
  ok: { fontSize: 12, color: 'green' },
});
