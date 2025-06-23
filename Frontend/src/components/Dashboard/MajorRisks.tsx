import './MajorRisks.scss';

const riskData = [
  { name: 'Data at risk', count: 3, icon: '🛡️' },
  { name: 'Malware', count: 0, icon: '🐞' },
  { name: 'Outdated service', count: 0, icon: '🔄' },
  { name: 'Authentication risk', count: 0, icon: '🔑' },
  { name: 'Lateral Movement', count: 0, icon: '↔️' },
  { name: 'Unpatched resources', count: 2, icon: '🩹' },
];

export default function MajorRisks() {
  return (
    <div className="major-risks-card">
        <h2 className="card__title">Major Risks</h2>
        <ul className="major-risks-list">
            {riskData.map(risk => (
                <li key={risk.name} className={`major-risks-list__item ${risk.count > 0 ? 'active' : ''}`}>
                    <span className="major-risks-list__icon">{risk.icon}</span>
                    <span className="major-risks-list__name">{risk.name}</span>
                    <span className="major-risks-list__count">{risk.count > 0 ? risk.count : ''}</span>
                </li>
            ))}
        </ul>
    </div>
  );
} 