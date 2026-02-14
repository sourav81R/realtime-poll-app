export default function PollResults({ options }) {
  const total = options.reduce((sum, o) => sum + o.votes, 0);

  return (
    <div>
      <h3>Results</h3>

      {options.map((o, i) => {
        const percent = total ? ((o.votes / total) * 100).toFixed(1) : 0;

        return (
          <p key={i}>
            {o.text} — {o.votes} votes ({percent}%)
          </p>
        );
      })}
    </div>
  );
}
