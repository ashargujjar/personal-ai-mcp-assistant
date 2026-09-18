import json
import os
from langchain_openai  import ChatOpenAI


def generate_queries(question: str, number_of_queries: int = 4) -> list[str]:
  if not question.strip():
        return []
  model = ChatOpenAI(
      model=os.getenv("OPENAI_QUERY_MODEL", "gpt-4o-mini"),
      temperature=0.2,
    )
  prompt = f"""
Generate {number_of_queries} different search queries for the user's question.

The queries should:
- Preserve the user's intent
- Use different wording and relevant technical terms
- Be useful for semantic search over document chunks
- Avoid answering the question
- Return only a JSON array of strings

User question:
{question}
"""
  response = model.invoke(prompt)
  content = response.content
  if not isinstance(content, str):
      content = str(content)
  try:
      queries=json.loads(content)
  except json.JSONDecodeError:
        queries = []
  if not isinstance(queries, list):
        queries = []
  cleaned = [
        query.strip()
        for query in queries
        if isinstance(query, str) and query.strip()
    ]
  return list(dict.fromkeys([question.strip(), *cleaned]))[:number_of_queries + 1]
  
  

  
  
