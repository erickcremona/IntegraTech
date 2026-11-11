import { useState } from 'react';

type DemoState = 'empty' | 'loading' | 'error' | 'success';
const choices: { value: DemoState; label: string }[] = [
  { value: 'empty', label: 'Vazio' },
  { value: 'loading', label: 'Carregando' },
  { value: 'error', label: 'Erro' },
  { value: 'success', label: 'Sucesso' },
];

export function App() {
  const [state, setState] = useState<DemoState>('empty');
  const [theme, setTheme] = useState('light');
  return <div className="app" data-theme={theme}>
    <a className="skip-link" href="#content">Ir para o conteúdo</a>
    <header className="page-header"><span className="wordmark">__PROJECT_NAME__</span><span className="badge">Referência técnica</span></header>
    <main id="content" tabIndex={-1}>
      <p className="eyebrow">Base de interface</p>
      <h1>Um ponto de partida para a interface.</h1>
      <p className="intro">Explore estados de interação e preferências visuais. Esta referência neutra não representa o design aprovado do produto.</p>
      <section className="panel" aria-labelledby="preview-heading">
        <div className="panel-heading"><h2 id="preview-heading">Estados da interface</h2><label>Tema <select value={theme} onChange={event => setTheme(event.target.value)}><option value="light">Claro</option><option value="dark">Escuro</option></select></label></div>
        <fieldset><legend>Escolha um estado para demonstrar</legend><div className="choices">{choices.map(choice => <label className="choice" key={choice.value}><input type="radio" name="state" value={choice.value} checked={state === choice.value} onChange={() => setState(choice.value)} />{choice.label}</label>)}</div></fieldset>
        <div className="preview" aria-busy={state === 'loading'}>
          {state === 'empty' && <div role="status"><h3>Nenhum conteúdo ainda</h3><p>Selecione outro estado para explorar esta referência.</p></div>}
          {state === 'loading' && <div role="status"><h3>Carregando demonstração…</h3><p>Aguarde. Este estado é controlado manualmente, sem chamada de rede.</p></div>}
          {state === 'error' && <div role="alert"><h3>Não foi possível concluir a demonstração</h3><p>Este erro é simulado. Você pode tentar novamente.</p><button type="button" onClick={() => setState('success')}>Tentar novamente</button></div>}
          {state === 'success' && <div role="status"><h3>Demonstração concluída</h3><p>O estado de sucesso está pronto para inspeção.</p><button type="button" onClick={() => setState('empty')}>Reiniciar demonstração</button></div>}
        </div>
      </section>
    </main>
    <footer>Referência local · Sem dados de negócio · Sem serviços externos</footer>
  </div>;
}
