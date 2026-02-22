"""add_purchase_state_and_notes

Revision ID: a1b2c3d4e5f6
Revises: 52419a8cac98
Create Date: 2026-02-06 05:15:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '52419a8cac98'
branch_labels = None
depends_on = None


def upgrade():
    # Agregar columna state a purchases
    op.add_column('purchases', sa.Column('state', sa.Enum('DRAFT', 'CONFIRMED', 'CANCELLED', name='purchasestate'), nullable=False, server_default='DRAFT'))
    
    # Agregar columna notes a purchases
    op.add_column('purchases', sa.Column('notes', sa.String(), nullable=True))


def downgrade():
    # Eliminar columnas agregadas
    op.drop_column('purchases', 'notes')
    op.drop_column('purchases', 'state')
    
    # Eliminar el enum type (solo necesario en PostgreSQL)
    # En SQLite esto no es necesario
    # op.execute('DROP TYPE purchasestate')
