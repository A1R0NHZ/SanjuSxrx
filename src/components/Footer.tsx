export function Footer() {
  return (
    <footer className="mt-24 border-t border-reactor-line py-12 px-6 bg-black/30">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="max-w-sm">
          <p className="text-[10px] font-mono text-stone-500 uppercase mb-2">
            Dedication
          </p>
          <p className="text-sm italic text-stone-400 font-serif leading-relaxed">
            Some secrets need encryption. Some truths deserve to be written in
            plaintext. — Bala
          </p>
        </div>
        <div className="flex gap-12 font-mono text-[10px] text-stone-600">
          <div>
            <p className="text-white font-bold mb-2">VERSION</p>
            <p>Sx-1.0.0-FINAL</p>
          </div>
          <div>
            <p className="text-white font-bold mb-2">PRIMITIVES</p>
            <p>AES-256-GCM</p>
          </div>
          <div>
            <p className="text-white font-bold mb-2">LICENSE</p>
            <p>RESEARCH USE</p>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto mt-8 text-[10px] font-mono text-stone-600">
        SxCryptRx is a research project. The vault is vault-local,
        non-destructive, and never touches files outside its container. AES
        protects ciphertext. SxCryptRx protects the vault around it.
      </div>
    </footer>
  );
}
