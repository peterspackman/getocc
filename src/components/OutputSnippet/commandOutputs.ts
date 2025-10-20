// Simple shared state for command outputs
const outputs = new Map<string, string>();

export function setCommandOutput(id: string, output: string) {
  outputs.set(id, output);
}

export function getCommandOutput(id: string): string | undefined {
  return outputs.get(id);
}
