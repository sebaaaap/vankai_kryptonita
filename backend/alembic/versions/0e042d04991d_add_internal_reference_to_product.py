"""Add internal_reference to product

Revision ID: 0e042d04991d
Revises: a1b2c3d4e5f6
Create Date: 2026-02-06 16:01:08.413426

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e042d04991d'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use batch_alter_table for SQLite compatibility
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.add_column(sa.Column('internal_reference', sa.String(), nullable=True))
        batch_op.create_index(batch_op.f('ix_products_internal_reference'), ['internal_reference'], unique=False)

def downgrade() -> None:
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_products_internal_reference'))
        batch_op.drop_column('internal_reference')
