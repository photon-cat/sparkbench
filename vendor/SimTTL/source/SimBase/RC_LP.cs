// ================================================
//
// SPDX-FileCopyrightText: 2025 Stefan Warnke
//
// SPDX-License-Identifier: BeerWare
//
//=================================================

//#define DEBUG_WRITE
#define NOT_DEPRECIATED

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.Remoting.Lifetime;
using System.Text;
using System.Threading.Tasks;

namespace SimBase
{
#if OLD_IMPLEMENTATION
    /// <summary>
    /// RC-LowPass class.
    /// </summary>
    public class RC_LP : BaseElement
    {
        /// <summary>Input pin of the low-pass.</summary>
        public Pin In;
        /// <summary>Output pin of the low-pass.</summary>
        public Pin Out;

        /// <summary>Capacitor value.</summary>
        protected double c;
        ///  <summary>Resistor value.</summary>
        protected double r;

        /// <summary>Time constants of the RC high-pass.</summary>
        private double tau;
        /// <summary>Last simulation time value.</summary>
        private double lastTime;
        /// <summary>Current output voltage.</summary>
        private double vout;

        /// <summary>
        /// Creates the RC_LP instance. 
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="C">Capacitor value.</param>
        /// <param name="R">Resistor value.</param>
        public RC_LP(string Name, double R, double C) : this(Name,null,R,C) { }

        /// <summary>
        /// Creates the RC_LP instance. 
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="NetIn">Input Net object</param>
        /// <param name="C">Capacitor value.</param>
        /// <param name="R">Resistor value.</param>
        public RC_LP(string Name, Net NetIn, double R, double C) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            this.In = new Pin(this, "In", "", LineMode.In, SignalState.L, NetIn);
            this.Out = new Pin(this, "Out", "", LineMode.OpenDrain, SignalState.L, 0);
            r = R;
            c = C;
            tau = R * C;
            lastTime = 0;
            vout = 5;

            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, this.In);

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, this.Out);
        }


        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            lastTime = 0;
            vout = 0;
        }

        /// <summary>
        /// Update output to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);
            
            if (Out.ConnectedNet != null)
            {
                SignalState state = Out.ConnectedNet.GetExclusiveState(Out);
                if (state == SignalState.L)
                {
                    vout = 0;
                    Out.NewOutState = SignalState.L;
                    lastTime = Time;
#if DEBUG_WRITE
                    if (In.ConnectedNet.Name == "CLK0")
                        Debug.WriteLine("Time=" + Time.ToString() + ",state=" + state.ToString() +",In="+ In.State.ToString() + ",vout=" + vout.ToString() +",Out="+Out.State.ToString());
#endif
                    return;
                }
                else if (state == SignalState.H)
                {
                    vout = 5;
                    Out.NewOutState = SignalState.H;
                    lastTime = Time;
#if DEBUG_WRITE
                    if (In.ConnectedNet.Name == "CLK0")
                        Debug.WriteLine("Time=" + Time.ToString() + ",state=" + state.ToString() +",In="+ In.State.ToString() + ",vout=" + vout.ToString() +",Out="+Out.State.ToString());
#endif
                    return;
                }
            }
 
            double dt = (Time - lastTime) * 1e-9;
            double a = dt / (tau + dt);
            double vin = (this.In.State == SignalState.H) ? 5.0 : 0.0;
            vout = vout + a * (vin - vout);
            if ((Out.State == SignalState.L) && (vout >= 2.0))
                Out.NewOutState = SignalState.H;
            else if ((Out.State == SignalState.H) && (vout <= 0.8))
                Out.NewOutState = SignalState.L;

#if DEBUG_WRITE
            if (In.ConnectedNet.Name == "CLK0")
                Debug.WriteLine("Time=" + Time.ToString() + ",dt=" + dt.ToString()+",tau="+tau.ToString() + ",a=" + a.ToString() +",In="+ In.State.ToString() + ",vout=" + vout.ToString() +",Out="+Out.State.ToString()+ ",a*vout=" + (a*vout).ToString() + ",(vin - vout)=" + (vin - vout).ToString()+",a*(vin - vout)=" + (a*(vin - vout)).ToString());
#endif
            lastTime = Time;

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
#endif //OLD_IMPLEMENTATION


    /// <summary>
    /// RC-LowPass class.
    /// </summary>
    public class RC_LP : BaseElement
    {
        /// <summary>Threshold for low-to-high transition at 74HCT14.</summary>
        public const double THRESHOLD_HIGH = 1.6;
        /// <summary>Threshold for high-to-low transition at 74HCT14.</summary>
        public const double THRESHOLD_LOW = 1.0;

        /// <summary>Input pin of the low-pass.</summary>
        public Pin In;
        /// <summary>Output pin of the low-pass.</summary>
        public Pin Out;

        /// <summary>Capacitor value.</summary>
        protected double c;
        ///  <summary>Resistor value for low input.</summary>
        protected double rL;
        ///  <summary>Resistor value for high input.</summary>
        protected double rH;

        /// <summary>Time constants of the RC high-pass for low input.</summary>
        private double tauL;
        /// <summary>Time constants of the RC high-pass for high input.</summary>
        private double tauH;

        /// <summary>Last simulation time value.</summary>
        private double lastTime;
        /// <summary>Current output voltage.</summary>
        private double vout;

#if NOT_DEPRECIATED
        /// <summary>
        /// Creates the RC_LP instance. 
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="C">Capacitor value.</param>
        /// <param name="R">Resistor value.</param>
        public RC_LP(string Name, double R, double C) : this(Name, null, R, R, C) { }

        /// <summary>
        /// Creates the RC_LP instance. 
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="NetIn">Input Net object</param>
        /// <param name="C">Capacitor value.</param>
        /// <param name="R">Resistor value.</param>
        public RC_LP(string Name, Net NetIn, double R, double C) : this(Name, NetIn, R, R, C) { }
#endif //#if NOT_DEPRECIATED

        /// <summary>
        /// Creates the RC_LP instance. 
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="RL">Resistor value for low input.</param>
        /// <param name="RH">Resistor value for high input.</param>
        /// <param name="C">Capacitor value.</param>
        public RC_LP(string Name, double RL, double RH, double C) : this(Name, null, RL,RH, C) { }

        /// <summary>
        /// Creates the RC_LP instance. 
        /// </summary>
        /// <param name="Name">Name of this element.</param>
        /// <param name="NetIn">Input Net object</param>
        /// <param name="RL">Resistor value for low input.</param>
        /// <param name="RH">Resistor value for high input.</param>
        /// <param name="C">Capacitor value.</param>
        public RC_LP(string Name, Net NetIn, double RL, double RH, double C) : base(Name)
        {
            Power = new Pin[0];
            Ground = new Pin[0];
            Passive = new Pin[0];

            this.In = new Pin(this, "In", "", LineMode.In, SignalState.L, NetIn);
            this.Out = new Pin(this, "Out", "", LineMode.OpenDrain, SignalState.L, 0);
            rL = RL;
            rH = RH;
            c = C;
            tauL = RL * C;
            tauH = RH * C;
            lastTime = 0;
            vout = 5;

            Inputs = new Pin[1][];
            SetPinArray(Inputs, 0, this.In);

            Outputs = new Pin[1][];
            SetPinArray(Outputs, 0, this.Out);
        }


        /// <summary>
        /// Restart the simulation to all pins.
        /// </summary>
        public override void SimulationRestart()
        {
            base.SimulationRestart();
            lastTime = 0;
            vout = 0;
        }

        /// <summary>
        /// Update output to the simulation time.
        /// </summary>
        /// <param name="Time">Time value to update to.</param>
        public override void Update(double Time)
        {
            base.Update(Time);

            if (Out.ConnectedNet != null)
            {
                SignalState state = Out.ConnectedNet.GetExclusiveState(Out);
                if (state == SignalState.L)
                {
                    vout = 0;
                    Out.NewOutState = SignalState.L;
                    lastTime = Time;
#if DEBUG_WRITE
                    if (In.ConnectedNet.Name == "CLK0")
                        Debug.WriteLine("Time=" + Time.ToString() + ",state=" + state.ToString() + ",In=" + In.State.ToString() + ",vout=," + vout.ToString() + ",Out=" + Out.State.ToString());
#endif
                    return;
                }
                else if (state == SignalState.H)
                {
                    vout = 5;
                    Out.NewOutState = SignalState.H;
                    lastTime = Time;
#if DEBUG_WRITE
                    if (In.ConnectedNet.Name == "CLK0")
                        Debug.WriteLine("Time=" + Time.ToString() + ",state=" + state.ToString() + ",In=" + In.State.ToString() + ",vout=," + vout.ToString() + ",Out=" + Out.State.ToString());
#endif
                    return;
                }
            }

            double dt = (Time - lastTime) * 1e-9;
            double tau = (this.In.State == SignalState.H) ? tauH : tauL;
            double a = dt / (tau + dt);
            double vin = (this.In.State == SignalState.H) ? 5.0 : 0.0;
            vout = vout + a * (vin - vout);
            if ((Out.State == SignalState.L) && (vout >= THRESHOLD_HIGH))
                Out.SetOutState(SignalState.H);
            else if ((Out.State == SignalState.H) && (vout <= THRESHOLD_LOW))
                Out.SetOutState(SignalState.L);

#if DEBUG_WRITE
            if (In.ConnectedNet.Name == "CLK0")
                Debug.WriteLine("Time=" + Time.ToString() + ",dt=" + dt.ToString() + ",tau=" + tau.ToString() + ",a=" + a.ToString() + ",In=" + In.State.ToString() + ",vout=," + vout.ToString() + ",Out=" + Out.State.ToString() + ",a*vout=" + (a * vout).ToString() + ",(vin - vout)=" + (vin - vout).ToString() + ",a*(vin - vout)=" + (a * (vin - vout)).ToString() + "," + (In.State == SignalState.L ? "0" : "5") + ","+(Out.State == SignalState.L ? "1":"4"));
#endif
            lastTime = Time;

        }

        ///<summary>Resistor value for low input.</summary>
        public double RL
        {
            get { return rL; }
        }

        ///<summary>Resistor value for high input.</summary>
        public double RH
        {
            get { return rH; }
        }

        ///<summary>Capacitor value.</summary>
        public double C
        {
            get { return c; }
        }

    }
}