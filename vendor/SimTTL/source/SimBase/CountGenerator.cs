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
    /// A special element to generate a clock generator and counter combination.
    /// </summary>
    public class CountGenerator:BaseElement
    {
        /// <summary>Clock interval.</summary>
        protected double interval;
        /// <summary>Last time value.</summary>
        protected double lastTime;
        /// <summary>Timer value.</summary>
        protected double Timer;
        /// <summary>Counter value.</summary>
        protected int counter;
        /// <summary>Counter value to load at restart.</summary>
        protected int startCounter;

        /// <summary>Clock and counter output pins.</summary>
        public Pin[] Out;
        /// <summary>Clock and counter inverted output pins.</summary>
        public Pin[] Outn;

        /// <summary>
        /// Creates the instance of CountGenerator.
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="Nout">Number of outputs.</param>
        /// <param name="Interval">Clock interval.</param>
        /// <param name="StartCounter">Counter value to load at restart.</param>
        public CountGenerator(string Name, int Nout, double Interval, int StartCounter) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            this.interval = Interval;
            this.startCounter = StartCounter;
            this.Out = new Pin[Nout]; 
            this.Outn = new Pin[Nout];
            for (int i = 0; i < Nout; i++)
            {
                Out[i] = new Pin(this, "Out" + i.ToString(), i.ToString(), LineMode.Out, SignalState.L, 0);
                Outn[i] = new Pin(this, "Outn" + i.ToString(), (Nout+i).ToString(), LineMode.Out, SignalState.H, 0);
            }

            Outputs = new Pin[2][];
            Outputs[0] = Out;
            Outputs[1] = Outn;

            SimulationRestart();
        }

        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            counter = startCounter;
            Timer = 0;
            lastTime = 0;
            SetOutputStates(SignalState.L);
        }

        /// <summary>
        /// Update outputs and inputs to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            double dt = Time - lastTime;
            lastTime = Time;
            Timer += dt;
            if (Timer >= interval)
            {
                Timer = Timer - Interval;
                counter += 1;
                for (int i = 0; i < Out.Length; i++)
                {
                    if ((counter & (1 << i)) != 0)
                    {
                        Out[i].NewOutState = SignalState.H;
                        Outn[i].NewOutState = SignalState.L;
                    }
                    else
                    {
                        Out[i].NewOutState = SignalState.L;
                        Outn[i].NewOutState = SignalState.H;
                    }
                }
            }
            UpdateOutputs(Time);
        }

        /// <summary>
        /// Gets clock interval.
        /// </summary>
        public double Interval
        {
            get { return interval; }
        }

        /// <summary>
        /// Get counter value to load at restart.
        /// </summary>
        public int StartCounter
        {
            get { return startCounter; }
        }

        /// <summary>
        /// Gets the number of outputs.
        /// </summary>
        public int Nout
        {
            get { return this.Out.Length; }
        }
    }
}
