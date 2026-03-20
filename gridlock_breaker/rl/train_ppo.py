"""
rl/train_ppo.py

Trains a PPO agent on the SUMO 4×4 grid traffic environment.
Uses stable-baselines3's PPO implementation.

Usage:
    python rl/train_ppo.py                         # full 100k step training
    python rl/train_ppo.py --timesteps 10000       # quick smoke test
    python rl/train_ppo.py --timesteps 10000 --gui # with SUMO GUI (slow)
"""

import os
import sys
import argparse

# Ensure project root is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import config
from env.traffic_env import TrafficEnv

from stable_baselines3 import PPO
from stable_baselines3.common.env_checker import check_env
from stable_baselines3.common.callbacks import CheckpointCallback


def train(timesteps: int = None, gui: bool = False):
    total_timesteps = timesteps or config.PPO_TOTAL_TIMESTEPS
    os.makedirs(config.MODEL_DIR, exist_ok=True)

    print(f"🤖 Initialising TrafficEnv (AI grid, {total_timesteps} timesteps)...")
    env = TrafficEnv(sumo_cfg=config.AI_CFG, gui=gui, seed=42)

    # Validate the env conforms to Gym API
    print("🔍 Checking environment compatibility...")
    check_env(env, warn=True)

    # Save a checkpoint every 10k steps so we can recover mid-train
    checkpoint_cb = CheckpointCallback(
        save_freq=10_000,
        save_path=config.MODEL_DIR,
        name_prefix="ppo_traffic_ckpt",
        verbose=1,
    )

    print(f"🚀 Starting PPO training for {total_timesteps} steps...")
    model = PPO(
        policy="MlpPolicy",
        env=env,
        n_steps=config.PPO_N_STEPS,
        batch_size=config.PPO_BATCH_SIZE,
        learning_rate=3e-4,
        gamma=0.99,
        gae_lambda=0.95,
        clip_range=0.2,
        ent_coef=0.01,       # small entropy bonus encourages exploration
        verbose=1,
    )

    model.learn(
        total_timesteps=total_timesteps,
        callback=checkpoint_cb,
        progress_bar=True,
    )

    model.save(config.PPO_MODEL_PATH)
    env.close()

    print(f"\n✅ PPO model saved to: {config.PPO_MODEL_PATH}.zip")
    print("Next: python simulation/run_ai.py")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train PPO agent on SUMO grid")
    parser.add_argument(
        "--timesteps", type=int, default=None,
        help=f"Training timesteps (default: {config.PPO_TOTAL_TIMESTEPS})"
    )
    parser.add_argument(
        "--gui", action="store_true",
        help="Launch SUMO-GUI for visual debugging (very slow)"
    )
    args = parser.parse_args()
    train(timesteps=args.timesteps, gui=args.gui)
