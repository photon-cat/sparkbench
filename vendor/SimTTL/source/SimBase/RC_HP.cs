// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.Remoting.Lifetime;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
    /// <summary>
    /// RC-Highpass class.
    /// </summary>
    public class RC_HP : BaseElement
    {
        /// <summary>Input pin of the high-pass.</summary>
        public Pin In;
        /// <summary>Output pin of the high-pass.</summary>
        public Pin Out;

        /// <summary>Capacitor value.</summary>
        protected double c;
        ///  <summary>Resistor value.</summary>
        protected double r;

        /// <summary>Time constants of the RC high-pass.</summary>
        private double tau;

        /// <summary>Last simulation time value.</summary>
        private double lastTime;
        /// <summary>Current input voltage.</summary>
        private double vin;
        /// <summary>Current output voltage.</summary>
        private double vout;

        /// <summary>
        /// Creates the RC_HP instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="C">Capacitor value.</param>
        /// <param name="R">Resistor value.</param>
        public RC_HP(string Name, double C, double R) : this(Name,null,C,R) { }

        /// <summary>
        /// Creates the RC_HP instance.
        /// </summary>
        /// <param name="Name">Name of the element.</param>
        /// <param name="NetIn">Input Net object</param>
        /// <param name="C">Capacitor value.</param>
        /// <param name="R">Resistor value.</param>
        public RC_HP(string Name, Net NetIn, double C, double R) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            this.In = new Pin(this, "In", "", LineMode.In, SignalState.L, NetIn);
            this.Out = new Pin(this, "Out", "", LineMode.Out, SignalState.L, 0);
            r = R;
            c = C;
            tau = R * C;
            lastTime = 0;
            vin = 5;
            vout = 5;

            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, this.In);

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, this.Out);
        }

        /// <summary>
        /// Restart the simulation.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            lastTime = 0;
            vin = 0;
            vout = 0;
        }

        /// <summary>
        /// Update output to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            double dt = (Time- lastTime)*1e-9;
            double a = tau / (tau + dt);
            double vin0 = (this.In.State == SignalState.H) ? 5.0 : 0.0;
            vout = a * vout + a * (vin0 - vin);
            if (vout>=2.5)
                Out.NewOutState = SignalState.H;
            else
                Out.NewOutState = SignalState.L;

#if DEBUG_WRITE
            Debug.WriteLine("Time=" + Time.ToString() + ",dt=" + dt.ToString()+",tau="+tau.ToString() + ",a=" + a.ToString() +",In="+ In.State.ToString() + ",vin0=" + vin0.ToString() + ",vout=" + vout.ToString() +",Out="+Out.State.ToString()+ ",a*vout=" + (a*vout).ToString() + ",(vin0 - vin)=" + (vin0 - vin).ToString()+",a*(vin0 - vin)=" + (a*(vin0 - vin)).ToString());
#endif
            lastTime = Time;
            vin = vin0;

        }

        ///<summary>Resistor value.</summary>
        public double R
        {
            get { return r; }
        }

        ///<summary>Capacitor value.</summary>
        public double C
        {
            get { return c; }
        }


    }
}