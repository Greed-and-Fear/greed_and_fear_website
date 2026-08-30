import os
from typing import List, Dict, Any
import requests
from fastapi import FastAPI, HTTPException

app = FastAPI()

# Configuration
GRAPHQL_ENDPOINT = os.getenv("HASURA_GRAPHQL_ENDPOINT", "https://gql.greedandfear.in/v1/graphql")
HASURA_ADMIN_SECRET = os.getenv("HASURA_ADMIN_SECRET")

# GraphQL Query
STOCK_MWPL_QUERY = """
query StockMWPLQuery {
  stock_mwpl_history(order_by: [{scrip_name: asc}, {trade_date: desc}]) {
    id
    stock_id
    trade_date
    isin
    scrip_code
    scrip_name
    mwpl
    open_interest
    recorded_at
    stock {
      id
      symbol
      company_name
      exchange {
        name
      }
      stock_current_price {
        close
        previous_close
        change
        change_percent
        volume
        price_at
      }
    }
  }
}
"""

@app.post("/api/market/raw-mwpl-history", response_model=List[Dict[str, Any]])
@app.get("/api/market/raw-mwpl-history", response_model=List[Dict[str, Any]])
async def get_raw_mwpl_history():
    if not HASURA_ADMIN_SECRET:
        raise HTTPException(
            status_code=500,
            detail="HASURA_ADMIN_SECRET environment variable is not configured on the backend server."
        )

    headers = {
        "Content-Type": "application/json",
        "x-hasura-admin-secret": HASURA_ADMIN_SECRET
    }

    try:
        response = requests.post(
            GRAPHQL_ENDPOINT,
            headers=headers,
            json={
                "operationName": "StockMWPLQuery",
                "query": STOCK_MWPL_QUERY,
                "variables": {}
            },
            timeout=15
        )
        response.raise_for_status()
        result = response.json()
        
        if "errors" in result:
            errors_str = ", ".join([e.get("message", "Unknown error") for e in result["errors"]])
            raise HTTPException(status_code=502, detail=f"Hasura GraphQL Error: {errors_str}")
        
        return result.get("data", {}).get("stock_mwpl_history") or []

    except requests.exceptions.RequestException as err:
        raise HTTPException(status_code=502, detail=f"Failed to query Hasura: {str(err)}")
