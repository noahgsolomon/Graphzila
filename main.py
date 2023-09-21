import os
import json
import openai
import logging
from bs4 import BeautifulSoup
import re
from neo4j import GraphDatabase

# Set your OpenAI API key
openai.api_key = ""
response_data = ""

# If Neo4j credentials are set, then Neo4j is used to store information
neo4j_username = os.environ.get("NEO4J_USERNAME")
neo4j_password = os.environ.get("NEO4J_PASSWORD")
neo4j_url = os.environ.get("NEO4J_URL")
neo4j_driver = None
if neo4j_username and neo4j_password and neo4j_url:
    neo4j_driver = GraphDatabase.driver(
        neo4j_url, auth=(neo4j_username, neo4j_password))

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger()

# Define your AWS Lambda handler function
def lambda_handler(event, context):
    print("hiii squidward")
    try:
        global response_data
        request_data = json.loads(event['body'])
        print("request: " + str(request_data))

        user_input = request_data.get("user_input", "")

        if not user_input:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "No input provided"})
            }

        print("Starting OpenAI call")
        completion = openai.ChatCompletion.create(
            model="gpt-3.5-turbo-16k",
            messages=[
                {
                    "role": "user",
                    "content": f"Help me understand following by describing as a detailed knowledge graph: {user_input}"
                }
            ],
            functions=[
                {
                    "name": "knowledge_graph",
                    "description": "Generate a knowledge graph with entities and relationships. Make the label the relationship between the nodes like java to jre would be 'runs on', etc.. Use the colors to help "
                                   "differentiate between different node or edge types/categories to differentiate between nodes. Always provide light "
                                   "pastel colors that work well with black font. Please try to use a different color for different nodes. And if you can find a wiki for the "
                                   "concept, share the full link, empty string otherwise.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "metadata": {
                                "type": "object",
                                "properties": {
                                    "createdDate": {"type": "string"},
                                    "lastUpdated": {"type": "string"},
                                    "description": {"type": "string"}
                                }
                            },
                            "nodes": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "id": {"type": "string"},
                                        "label": {"type": "string"},
                                        "type": {"type": "string"},
                                        "color": {"type": "string"},  # Added color property
                                        "wiki": {"type": "string"},  # Added wiki property
                                        "properties": {
                                            "type": "object",
                                            "description": "Additional attributes for the node"
                                        }
                                    },
                                    "required": [
                                        "id",
                                        "label",
                                        "type",
                                        "color",
                                        "wiki"
                                    ]  # Added color to required
                                }
                            },
                            "edges": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "from": {"type": "string"},
                                        "to": {"type": "string"},
                                        "relationship": {"type": "string"},
                                        "direction": {"type": "string"},
                                        "color": {"type": "string"},  # Added color property
                                        "properties": {
                                            "type": "object",
                                            "description": "Additional attributes for the edge"
                                        }
                                    },
                                    "required": [
                                        "from",
                                        "to",
                                        "relationship",
                                        "color"
                                    ]  # Added color to required
                                }
                            }
                        },
                        "required": ["nodes", "edges"]
                    }
                }
            ],
            function_call={"name": "knowledge_graph"}
        )

        response_data = completion.choices[0]["message"]["function_call"]["arguments"]
        # Remove trailing commas
        response_data = re.sub(r',\s*}', '}', response_data)
        response_data = re.sub(r',\s*]', ']', response_data)
        print(response_data)

        # Process graph data using the response_data
        if neo4j_driver:
            nodes, _, _ = neo4j_driver.execute_query("""
            MATCH (n)
            WITH collect(
                {data: {id: n.id, label: n.label, color: n.color, wiki: n.wiki}}) AS node
            RETURN node
            """)

            print()
            nodes = [el['node'] for el in nodes][0]

            edges, _, _ = neo4j_driver.execute_query("""
            MATCH (s)-[r]->(t)
            WITH collect(
                {data: {source: s.id, target: t.id, label:r.type, color: r.color, wiki: r.wiki}}
            ) AS rel
            RETURN rel
            """)
            edges = [el['rel'] for el in edges][0]
        else:
            print(response_data)
            response_dict = json.loads(response_data)
            # Assume response_data is global or passed appropriately
            nodes = [
                {
                    "data": {
                        "id": node["id"],
                        "label": node["label"],
                        "color": node.get("color", "defaultColor"),
                        "wiki": node.get("wiki", ""),
                    }
                }
                for node in response_dict["nodes"]
            ]
            edges = [
                {
                    "data": {
                        "source": edge["from"],
                        "target": edge["to"],
                        "label": edge["relationship"],
                        "color": edge.get("color", "defaultColor"),
                    }
                }
                for edge in response_dict["edges"]
            ]

        return {
            "statusCode": 200,
            "body": json.dumps({"elements": {"nodes": nodes, "edges": edges}})
        }
    except Exception as e:
        logger.error(str(e))
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Internal server error"})
        }
