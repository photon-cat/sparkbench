// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// A special element to generate a clock.
    /// </summary>
    public class ClockGenerator : BaseElement
    {
        /// <summary>Clock interval.</summary>
        protected double interval;
        /// <summary>Start state low or high.</summary>
        protected SignalState startState;
        /// <summary>Start time to create a phase shift.</summary>
        protected double timerStart;
        /// <summary>Last time value.</summary>
        protected double lastTime;
        /// <summary>Timer value.</summary>
        protected double timer;

        /// <summary>Clock output pin.</summary>
        public Pin Out;


        /// <summary>
        /// Creates the ClockGenerator instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="StartState">Start state low or high.</param>
        /// <param name="Interval">Clock interval.</param>
        /// <param name="TimerStart">Start time to create a phase shift.</param>
        public ClockGenerator(string Name, int StartState, double Interval, double TimerStart) : this(Name, (SignalState)StartState, Interval, TimerStart) { }
        

        /// <summary>
        /// Creates the ClockGenerator instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="StartState">Start state low or high.</param>
        /// <param name="Interval">Clock interval.</param>
        /// <param name="TimerStart">Start time to create a phase shift.</param>
        public ClockGenerator(string Name, SignalState StartState, double Interval, double TimerStart) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            this.Out = new Pin(this, "Out", "1", LineMode.Out, StartState, 0);
            this.startState = StartState;
            this.interval = Interval;
            this.timerStart = TimerStart;
            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, Out);
            SimulationRestart();
        }

        /// <summary>
        /// Creates the ClockGenerator instance.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Interval">Clock interval.</param>
        public ClockGenerator(string Name, double Interval) : this(Name, SignalState.L, Interval, 0) { }

        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            lastTime = 0;
            timer = TimerStart;
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            double dt = Time - lastTime;
            lastTime = Time;
            timer += dt;
            if (timer >= Interval)
            {
                timer = timer - Interval;
                if (Out.State == SignalState.L)
                    Out.NewOutState = SignalState.H;
                else
                    Out.NewOutState = SignalState.L;
            }
            Out.UpdateOutput(Time);
        }

        /// <summary>Start state low or high.</summary>
        public SignalState StartState
        {
            get { return startState; }
        }

        /// <summary>Clock interval.</summary>
        public double Interval
        {
            get { return interval; }
        }

        /// <summary>Start time to create a phase shift.</summary>
        public double TimerStart
        { 
            get { return timerStart; } 
        }
    }
}
