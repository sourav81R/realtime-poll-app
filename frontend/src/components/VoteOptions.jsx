import API from "../api/axios";

export default function VoteOptions({ poll, refresh }) {
  const vote = async (index) => {
    try {
      await API.post(`/polls/${poll._id}/vote`, {
        optionIndex: index,
      });

      refresh();
    } catch (err) {
      alert(err.response?.data?.message || "Vote failed");
    }
  };

  return (
    <div>
      {poll.options.map((opt, i) => (
        <button key={i} onClick={() => vote(i)}>
          {opt.text}
        </button>
      ))}
    </div>
  );
}
