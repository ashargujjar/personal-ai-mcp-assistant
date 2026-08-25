import os
from contextlib import asynccontextmanager

from langchain_mcp_adapters.tools import load_mcp_tools
from mcp import ClientSession
from mcp.client.streamable_http import streamable_http_client

MCP_SERVER_URL = os.environ["MCP_URL"]


@asynccontextmanager
async def get_mcp_tools(jwt: str):
    """Open a connection to the MCP server for one request and yield LangChain-compatible tools.

    The connection must stay open for as long as the tools are used — each tool call goes
    back over this session to the MCP server — so the graph invocation needs to happen
    inside this `async with` block, not after it.
    """
    headers = {"Authorization": f"Bearer {jwt}"}
    async with streamable_http_client(MCP_SERVER_URL, headers=headers) as (read, write, _):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await load_mcp_tools(session)
            yield tools
