import { useState } from "react";
import API from "../api/axios";

export default function PollForm() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [link, setLink] = useState("");

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    setOptions([...options, ""]);
  };

  const createPoll = async () => {
    try {
      const res = await API.post("/polls", {
        question,
        options,
      });

      setLink(`http://localhost:5173/poll/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.message || "Error");
    }
  };

  return (
    <div>
      <input
        placeholder="Enter question"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      {options.map((opt, i) => (
        <input
          key={i}
          placeholder={`Option ${i + 1}`}
          value={opt}
          onChange={(e) => handleOptionChange(i, e.target.value)}
        />
      ))}

      <button onClick={addOption}>Add Option</button>

      <button onClick={createPoll}>Create</button>

      {link && (
        <p>
          Share Link: <a href={link}>{link}</a>
        </p>
      )}
    </div>
  );
}
