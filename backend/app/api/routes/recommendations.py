"""POST /api/recommendations (contrato en backend/docs/api-contract.md)."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, find_owned_plot
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Recomendaciones"])


@router.post("", response_model=RecommendationResponse)
def create_recommendation(body: RecommendationRequest, user: CurrentUser, session: DbSession) -> RecommendationResponse:
    """Siempre HTTP 200: el resultado va en `status` (`ok` | `insufficient_data`) y `mode`."""
    plot = find_owned_plot(session, user, body.plot_id)
    return recommendation_service.recommend(session, plot, body)
