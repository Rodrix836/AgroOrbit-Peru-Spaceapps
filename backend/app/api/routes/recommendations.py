"""Recomendaciones de rotación para parcelas del usuario autenticado."""

from fastapi import APIRouter

from app.api.deps import CurrentUser, DbSession, get_owned_plot_for_user
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services import recommendation_service

router = APIRouter(prefix="/recommendations", tags=["Recomendaciones"])


@router.post("", response_model=RecommendationResponse)
def create_recommendation(
    body: RecommendationRequest,
    user: CurrentUser,
    session: DbSession,
) -> RecommendationResponse:
    plot = get_owned_plot_for_user(session, user.id, body.plot_id)
    return recommendation_service.recommend(session, plot, body)
